from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, extract
from typing import List, Optional, Dict, Any
from datetime import date
from pydantic import BaseModel, ConfigDict
from decimal import Decimal

from app.db.session import get_db
from app.models.finance import Invoice, Transaction
from app.models.client import Client
from app.models.work import Work

router = APIRouter()

def safe_div(a: Decimal, b: Decimal) -> Optional[Decimal]:
    if not b or b == 0:
        return None
    return (a / b).quantize(Decimal("0.0001"))

@router.get("/finance-summary")
def get_finance_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db)
):
    inv_q = db.query(
        func.sum(Invoice.total_amount).label('total_billed'),
        func.sum(Invoice.professional_fee).label('professional_fee'),
    ).filter(Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"]))
    
    if date_from:
        inv_q = inv_q.filter(Invoice.invoice_date >= date_from)
    if date_to:
        inv_q = inv_q.filter(Invoice.invoice_date <= date_to)
        
    inv_res = inv_q.first()
    billed = inv_res.total_billed or Decimal("0")
    prof_fee = inv_res.professional_fee or Decimal("0")
    
    txn_q = db.query(
        Transaction.transaction_type,
        func.sum(Transaction.amount).label('total')
    )
    if date_from:
        txn_q = txn_q.filter(Transaction.transaction_date >= date_from)
    if date_to:
        txn_q = txn_q.filter(Transaction.transaction_date <= date_to)
        
    txn_res = txn_q.group_by(Transaction.transaction_type).all()
    
    collections = Decimal("0")
    govt_recovery = Decimal("0")
    other_recovery = Decimal("0")
    rjsc_cost = Decimal("0")
    
    for row in txn_res:
        if row.transaction_type == "COLLECTION":
            collections += (row.total or Decimal("0"))
        elif row.transaction_type == "GOVERNMENT_FEE_RECOVERY":
            govt_recovery += (row.total or Decimal("0"))
        elif row.transaction_type == "OTHER_RECOVERY":
            other_recovery += (row.total or Decimal("0"))
        elif row.transaction_type == "RJSC_COST":
            rjsc_cost += (row.total or Decimal("0"))
            
    outstanding = billed - collections
    
    return {
        "revenue": str(billed),
        "billed": str(billed),
        "collection": str(collections),
        "outstanding": str(outstanding),
        "professional_fee": str(prof_fee),
        "government_fee_recovery": str(govt_recovery),
        "other_recovery": str(other_recovery),
        "rjsc_cost": str(rjsc_cost),
        "net_professional_income": str(prof_fee - rjsc_cost)
    }

@router.get("/monthly")
def get_monthly_analytics(
    year: int,
    client_id: Optional[str] = None,
    service_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    inv_q = db.query(
        extract('month', Invoice.invoice_date).label('month'),
        func.sum(Invoice.total_amount).label('billed'),
        func.sum(Invoice.professional_fee).label('professional_fee')
    ).filter(
        extract('year', Invoice.invoice_date) == year,
        Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"])
    )
    
    if client_id:
        inv_q = inv_q.filter(Invoice.client_id == client_id)
    if service_id:
        inv_q = inv_q.join(Work, Invoice.work_id == Work.id).filter(Work.service_id == service_id)
        
    inv_res = inv_q.group_by(extract('month', Invoice.invoice_date)).all()
    
    txn_q = db.query(
        extract('month', Transaction.transaction_date).label('month'),
        Transaction.transaction_type,
        func.sum(Transaction.amount).label('total')
    ).filter(
        extract('year', Transaction.transaction_date) == year
    )
    
    if client_id:
        txn_q = txn_q.filter(Transaction.client_id == client_id)
    if service_id:
        txn_q = txn_q.join(Work, Transaction.work_id == Work.id).filter(Work.service_id == service_id)
        
    txn_res = txn_q.group_by(extract('month', Transaction.transaction_date), Transaction.transaction_type).all()
    
    cli_q = db.query(
        extract('month', Client.created_at).label('month'),
        func.count(Client.id).label('count')
    ).filter(
        extract('year', Client.created_at) == year
    )
    cli_res = cli_q.group_by(extract('month', Client.created_at)).all()
    
    months = {i: {"month": i, "billed": Decimal("0"), "collected": Decimal("0"), "outstanding": Decimal("0"), "professional_fee": Decimal("0"), "government_fee_recovery": Decimal("0"), "new_clients": 0} for i in range(1, 13)}
    
    for row in inv_res:
        m = int(row.month)
        months[m]["billed"] += (row.billed or Decimal("0"))
        months[m]["professional_fee"] += (row.professional_fee or Decimal("0"))
        
    for row in txn_res:
        m = int(row.month)
        val = (row.total or Decimal("0"))
        if row.transaction_type == "COLLECTION":
            months[m]["collected"] += val
        elif row.transaction_type == "GOVERNMENT_FEE_RECOVERY":
            months[m]["government_fee_recovery"] += val
            
    for row in cli_res:
        m = int(row.month)
        months[m]["new_clients"] = row.count
        
    for m in range(1, 13):
        months[m]["outstanding"] = months[m]["billed"] - months[m]["collected"]
        
    return [
        {
            "month": v["month"],
            "billed": str(v["billed"]),
            "collected": str(v["collected"]),
            "outstanding": str(v["outstanding"]),
            "professional_fee": str(v["professional_fee"]),
            "government_fee_recovery": str(v["government_fee_recovery"]),
            "new_clients": v["new_clients"]
        } for k, v in months.items()
    ]

@router.get("/service-growth")
def get_service_growth(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db)
):
    inv_q = db.query(
        Work.service_id,
        func.count(Invoice.id).label('work_count'),
        func.sum(Invoice.total_amount).label('billed'),
        func.sum(Invoice.professional_fee).label('professional_fee')
    ).join(Work, Invoice.work_id == Work.id).filter(
        Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"])
    )
    
    if date_from:
        inv_q = inv_q.filter(Invoice.invoice_date >= date_from)
    if date_to:
        inv_q = inv_q.filter(Invoice.invoice_date <= date_to)
        
    inv_res = inv_q.group_by(Work.service_id).all()
    
    txn_q = db.query(
        Work.service_id,
        func.sum(Transaction.amount).label('collected')
    ).join(Work, Transaction.work_id == Work.id).filter(
        Transaction.transaction_type == "COLLECTION"
    )
    
    if date_from:
        txn_q = txn_q.filter(Transaction.transaction_date >= date_from)
    if date_to:
        txn_q = txn_q.filter(Transaction.transaction_date <= date_to)
        
    txn_res = txn_q.group_by(Work.service_id).all()
    
    services = {}
    for row in inv_res:
        sid = row.service_id
        if not sid: continue
        services[sid] = {
            "service_id": sid,
            "work_count": row.work_count,
            "billed": row.billed or Decimal("0"),
            "professional_fee": row.professional_fee or Decimal("0"),
            "collected": Decimal("0")
        }
        
    for row in txn_res:
        sid = row.service_id
        if not sid: continue
        if sid not in services:
            services[sid] = {"service_id": sid, "work_count": 0, "billed": Decimal("0"), "professional_fee": Decimal("0"), "collected": Decimal("0")}
        services[sid]["collected"] += (row.collected or Decimal("0"))
        
    return [
        {
            "service_id": d["service_id"],
            "work_count": d["work_count"],
            "billed": str(d["billed"]),
            "professional_fee": str(d["professional_fee"]),
            "collected": str(d["collected"]),
            "outstanding": str(d["billed"] - d["collected"])
        } for d in services.values()
    ]

@router.get("/client-growth")
def get_client_growth(db: Session = Depends(get_db)):
    inv_q = db.query(
        Invoice.client_id,
        Client.legal_name,
        func.count(Invoice.id).label('work_count'),
        func.sum(Invoice.total_amount).label('billed'),
        func.max(Invoice.invoice_date).label('last_work_date')
    ).join(Client, Invoice.client_id == Client.id).filter(
        Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"])
    ).group_by(Invoice.client_id, Client.legal_name).all()
    
    txn_q = db.query(
        Transaction.client_id,
        func.sum(Transaction.amount).label('collected')
    ).filter(
        Transaction.transaction_type == "COLLECTION"
    ).group_by(Transaction.client_id).all()
    
    clients = {}
    for row in inv_q:
        cid = str(row.client_id)
        clients[cid] = {
            "client_id": cid,
            "legal_name": row.legal_name,
            "work_count": row.work_count,
            "billed": row.billed or Decimal("0"),
            "collected": Decimal("0"),
            "last_work_date": row.last_work_date
        }
        
    for row in txn_q:
        cid = str(row.client_id)
        if not cid: continue
        if cid in clients:
            clients[cid]["collected"] += (row.collected or Decimal("0"))
            
    return [
        {
            "client_id": d["client_id"],
            "legal_name": d["legal_name"],
            "work_count": d["work_count"],
            "billed": str(d["billed"]),
            "collected": str(d["collected"]),
            "outstanding": str(d["billed"] - d["collected"]),
            "last_work_date": d["last_work_date"]
        } for d in clients.values()
    ]

@router.get("/outstanding-aging")
def get_outstanding_aging(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(Invoice.status.in_(["ISSUED", "PARTIALLY_PAID"])).all()
    
    buckets = {
        "0-30": {"amount": Decimal("0"), "invoice_count": 0},
        "31-60": {"amount": Decimal("0"), "invoice_count": 0},
        "61-90": {"amount": Decimal("0"), "invoice_count": 0},
        "91-180": {"amount": Decimal("0"), "invoice_count": 0},
        "181+": {"amount": Decimal("0"), "invoice_count": 0}
    }
    
    today = date.today()
    for inv in invoices:
        collected = db.query(func.sum(Transaction.amount)).filter(
            Transaction.invoice_id == inv.id,
            Transaction.transaction_type == "COLLECTION"
        ).scalar() or Decimal("0")
        
        outstanding = inv.total_amount - collected
        if outstanding <= 0:
            continue
            
        age = (today - inv.invoice_date).days
        
        if age <= 30: b = "0-30"
        elif age <= 60: b = "31-60"
        elif age <= 90: b = "61-90"
        elif age <= 180: b = "91-180"
        else: b = "181+"
        
        buckets[b]["amount"] += outstanding
        buckets[b]["invoice_count"] += 1
        
    return [{"age_since_invoice": k, "amount": str(v["amount"]), "invoice_count": v["invoice_count"]} for k, v in buckets.items()]

@router.get("/mom")
def get_growth_metrics(db: Session = Depends(get_db)):
    today = date.today()
    
    def _month_range(y, m):
        if m == 12: return date(y, 12, 1), date(y+1, 1, 1)
        return date(y, m, 1), date(y, m+1, 1)

    cm_start, cm_end = _month_range(today.year, today.month)
    if today.month == 1:
        pm_start, pm_end = _month_range(today.year - 1, 12)
    else:
        pm_start, pm_end = _month_range(today.year, today.month - 1)
        
    py_start, py_end = _month_range(today.year - 1, today.month)

    def get_period_data(d_start, d_end):
        billed = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.invoice_date >= d_start, Invoice.invoice_date < d_end,
            Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"])
        ).scalar() or Decimal("0")
        
        collected = db.query(func.sum(Transaction.amount)).filter(
            Transaction.transaction_date >= d_start, Transaction.transaction_date < d_end,
            Transaction.transaction_type == "COLLECTION"
        ).scalar() or Decimal("0")
        
        prof = db.query(func.sum(Invoice.professional_fee)).filter(
            Invoice.invoice_date >= d_start, Invoice.invoice_date < d_end,
            Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"])
        ).scalar() or Decimal("0")
        
        new_cli = db.query(func.count(Client.id)).filter(
            Client.created_at >= d_start, Client.created_at < d_end
        ).scalar() or 0
        
        return {"billed": billed, "collected": collected, "professional_fee": prof, "new_clients": Decimal(new_cli)}
        
    cm = get_period_data(cm_start, cm_end)
    pm = get_period_data(pm_start, pm_end)
    py = get_period_data(py_start, py_end)
    
    return {
        "billed_mom": str(safe_div(cm["billed"] - pm["billed"], pm["billed"])) if safe_div(cm["billed"] - pm["billed"], pm["billed"]) is not None else None,
        "collected_mom": str(safe_div(cm["collected"] - pm["collected"], pm["collected"])) if safe_div(cm["collected"] - pm["collected"], pm["collected"]) is not None else None,
        "professional_fee_mom": str(safe_div(cm["professional_fee"] - pm["professional_fee"], pm["professional_fee"])) if safe_div(cm["professional_fee"] - pm["professional_fee"], pm["professional_fee"]) is not None else None,
        "new_clients_mom": str(safe_div(cm["new_clients"] - pm["new_clients"], pm["new_clients"])) if safe_div(cm["new_clients"] - pm["new_clients"], pm["new_clients"]) is not None else None,
        
        "billed_yoy": str(safe_div(cm["billed"] - py["billed"], py["billed"])) if safe_div(cm["billed"] - py["billed"], py["billed"]) is not None else None,
        "collected_yoy": str(safe_div(cm["collected"] - py["collected"], py["collected"])) if safe_div(cm["collected"] - py["collected"], py["collected"]) is not None else None,
        "professional_fee_yoy": str(safe_div(cm["professional_fee"] - py["professional_fee"], py["professional_fee"])) if safe_div(cm["professional_fee"] - py["professional_fee"], py["professional_fee"]) is not None else None,
        "new_clients_yoy": str(safe_div(cm["new_clients"] - py["new_clients"], py["new_clients"])) if safe_div(cm["new_clients"] - py["new_clients"], py["new_clients"]) is not None else None,
    }
