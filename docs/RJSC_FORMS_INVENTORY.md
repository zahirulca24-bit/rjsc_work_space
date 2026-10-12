# RJSC Statutory Forms Master Inventory

This document provides a comprehensive inventory of the Bangladesh Registrar of Joint Stock Companies and Firms (RJSC) statutory reference forms, cross-referenced against the official RJSC portal downloads catalog and local filesystem storage.

---

## 1. Executive Summary & Inventory Coverage
- **Total Reference PDF Files Found Locally:** 31 files in `E:\RJSC\rjsc FROM` (16 in root, 15 in `New folder`).
- **Official Registration & Returns Schedule Count:** 28 forms specified on the RJSC portal under *Process 3: Registration and Returns Filling*.
- **Local Samples Present:** 26 of the 28 official return forms + 5 additional statutory application/procedural forms (Name Clearance, Time Extensions, Certified Copy, Court Winding Up, Board Resolution).
- **Missing Samples from Local Filesystem:**
  1. **Form XI** (`reg_form_xi.html` - Notice of Situation of Office where a Foreign Company Registers)
  2. **Form XLII** (`rf_form_xlii.html` - Notice of Alteration in Names/Addresses of Persons Authorized to Accept Service for Foreign Company)

---

## 2. Master Forms Registry Table

| Sl | Form Name / Code | Local File Path | Official Portal URL | Applicable Entity & Service | Relevant Working Paper Section | Batch Status | Known Layout / Artifact / Placeholder Issues |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | **Form XII** (Particulars of Directors, Managers & Changes) | `E:\RJSC\rjsc FROM\FORM XII.pdf` | `http://123.49.32.36:7781/Guidlines/Download/FORM%20XII.htm` | Private/Public Co, Annual Return, Directorship Change | `directors_data` | **Batch 1 (Active)** | Landscape Legal (1008x612). Table space limited to 6 rows; requires dynamic multi-page continuation sheet for larger boards. |
| 2 | **Schedule X** (Annual Summary of Share Capital & Members) | `E:\RJSC\rjsc FROM\RJSC_Schedule X.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_schedule_x.html` | Companies with Share Capital, Annual Return | `company_data`, `shareholders_data`, `agm_analysis` | **Batch 1 (Active)** | Outdated century placeholder `19...` on Page 2 (Sec 20/21). Page 2 member table is static/insufficient for companies with multiple shareholders. Requires multi-page member register continuation sheet. Filing date != proof of AGM. |
| 3 | **Form 117** (Instrument of Transfer of Shares) | `E:\RJSC\rjsc FROM\FORM-117.pdf` | `http://123.49.32.36:7781/Guidlines/Download/FORM-117.htm` | Companies with Share Capital, Share Transfer | `shareholders_data`, `share_transfer_data` | **Batch 1 (Active)** | Outdated year placeholder `2003`. Browser print footer artifact `10/12/26, 2:34 AM FORM-117` at bottom. Non-standard dimensions (522x756 pt). Corrupted label `the said Transfer`. |
| 4 | **Form 23B** (Notice by Statutory Auditor) | `E:\RJSC\rjsc FROM\New folder\___ RJSC ___ Form 23B.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_23b.html` | Private/Public Co, Annual Return, Auditor Notice | `company_data`, `auditor_data` | Batch 2 | Single page portrait (612x792). Static browser-printed lines. |
| 5 | **Form VI** (Notice of Situation of Registered Office) | `E:\RJSC\rjsc FROM\RJSC __ Form VI.pdf` | `http://123.49.32.36:7781/Guidlines/Download/Form%20VI.htm` | Private/Public Co, Address Change / Incorporation | `company_data`, `registered_office` | Batch 2 | Multi-line text flow over dotted guide lines. 2 pages portrait. |
| 6 | **Form IX** (Consent of Director to Act) | `E:\RJSC\rjsc FROM\New folder\FORM IX.pdf` | `http://123.49.32.36:7781/Guidlines/Download/FORM%20IX.htm` | Private/Public Co, Incorporation / Appointment | `directors_data` | Batch 2 | Static table requiring director signatures and NID/TIN. |
| 7 | **Form X** (List of Persons Consenting to be Directors) | `E:\RJSC\rjsc FROM\FORM X.pdf` | `http://123.49.32.36:7781/Guidlines/Download/FORM%20X.htm` | Public Co, Incorporation | `directors_data` | Batch 2 | Dotted lines for signatures; single page portrait. |
| 8 | **Form I** (Declaration on Registration of Company) | `E:\RJSC\rjsc FROM\RJSC_ Form-I.pdf` | `http://123.49.32.36:7781/Guidlines/Download/reg_form_i.html` | Private/Public Co, Incorporation | `company_data` | Batch 2 | Advocate / Chartered Accountant statutory compliance declaration. |
| 9 | **Form III** (Notice of Consolidation / Division of Shares) | `E:\RJSC\rjsc FROM\New folder\__ Form-III __.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_iii.html` | Capital Restructuring | `capital_history` | Batch 3 | 2 pages portrait. Space for multiple share class divisions. |
| 10 | **Form IV** (Notice of Increase of Share Capital) | `E:\RJSC\rjsc FROM\New folder\__ Form-IV __.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_iv.html` | Authorized Capital Increase | `capital_history` | Batch 3 | Capital slab breakdown, 2 pages portrait. |
| 11 | **Form VII** (Statutory Report of Public Company) | `E:\RJSC\rjsc FROM\New folder\___ RJSC ___ Form VII.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_vii_prn.html` | Public Company Statutory Meeting | `company_data`, `capital_history` | Batch 3 | 4 pages portrait. Contains detailed cash receipts & payments accounts. |
| 12 | **Form VIII** (Special / Extraordinary Resolution) | `E:\RJSC\rjsc FROM\New folder\__ Form-VIII __.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_viii.html` | General Meeting Resolutions | `work_resolutions` | Batch 3 | Full-width freeform resolution text block. |
| 13 | **Form XIV** (Declaration before Commencing Business) | `E:\RJSC\rjsc FROM\RJSC_Form XIV.pdf` | `http://123.49.32.36:7781/Guidlines/Download/reg_form_xiv.html` | Public Company Commencement | `company_data` | Batch 3 | Minimum subscription verification. |
| 14 | **Form XV** (Return of Allotment of Shares) | `E:\RJSC\rjsc FROM\New folder\__ Form-XV __.pdf` | `http://123.49.32.36:7781/Guidlines/Download/FORM_XV.htm` | Share Allotment | `shareholders_data`, `capital_history` | Batch 3 | 2 pages. Allottee list with cash vs non-cash consideration. |
| 15 | **Form XVIII** (Particulars of Mortgages or Charges) | `E:\RJSC\rjsc FROM\New folder\___ RJSC ___ Form XVIII.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_xviii.html` | Mortgage / Charge Creation | `mortgage_charge` | Batch 4 | Secured debt instrument particulars, property schedule. |
| 16 | **Form XIX** (Modification of Mortgage or Charge) | `E:\RJSC\rjsc FROM\New folder\___ RJSC ___ Form XIX.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_xix.html` | Mortgage / Charge Variation | `mortgage_charge` | Batch 4 | 2 pages. Details of instrument variation. |
| 17 | **Form XXVIII** (Satisfaction of Mortgage / Charge) | `E:\RJSC\rjsc FROM\New folder\___ RJSC ___ Form XXVIII.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_xxviii.html` | Mortgage / Charge Release | `mortgage_charge` | Batch 4 | Full or partial release certification with lender NOC. |
| 18 | **Form XXXVI** (Foreign Co: Charter / Statutes / MOA) | `E:\RJSC\rjsc FROM\RJSC_ Form-XXXVI.pdf` | `http://123.49.32.36:7781/Guidlines/Download/reg_form_xxxvi.html` | Foreign Company Branch/Liaison | `company_data` | Batch 4 | Certified copy filing of overseas constitutional charter. |
| 19 | **Form XXXVII** (Foreign Co: Registered/Principal Office) | `E:\RJSC\rjsc FROM\RJSC_ Form-XXXVII.pdf` | `http://123.49.32.36:7781/Guidlines/Download/reg_form_xxxvii.html` | Foreign Company Branch/Liaison | `company_data` | Batch 4 | Principal place of business in origin country. |
| 20 | **Form XXXVIII** (Foreign Co: Directors & Managers) | `E:\RJSC\rjsc FROM\RJSC_ Form-XXXVIII.pdf` | `http://123.49.32.36:7781/Guidlines/Download/reg_form_xxxviii.html` | Foreign Company Directorship | `directors_data` | Batch 4 | Global directors & executive managers particulars. |
| 21 | **Form XXXIX** (Foreign Co: Person Authorised for Service) | `E:\RJSC\rjsc FROM\RJSC_ Form-XXXIX.pdf` | `http://123.49.32.36:7781/Guidlines/Download/reg_form_xxxix.html` | Foreign Company Representative | `company_data` | Batch 4 | Resident agent in Bangladesh authorized to accept service. |
| 22 | **Form XL** (Foreign Co: Notice of Place of Business) | `E:\RJSC\rjsc FROM\RJSC_ Form-XL.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_xl.html` | Foreign Company Bangladesh Office | `company_data` | Batch 4 | Situation of Bangladesh establishment office. |
| 23 | **Form XLI** (Foreign Co: Alteration in Address) | `E:\RJSC\rjsc FROM\RJSC _ Form XLI.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_form_xli.html` | Foreign Company Address Change | `company_data` | Batch 4 | 2 pages. Notice of alteration in local or overseas address. |
| 24 | **Summary of Balance Sheet & Profit & Loss** | `E:\RJSC\rjsc FROM\RJSC_ Summary of Balance Sheet and Profit & Loss Account.pdf` | `http://123.49.32.36:7781/Guidlines/Download/Balance_sheet.html` | Private/Public Co, Annual Filing | `financial_statements` | Batch 4 | Structured financial statement figures under Companies Act Schedule XI. |
| 25 | **Income & Expenditure Account** | `E:\RJSC\rjsc FROM\New folder\app.roc.gov.bd_Guidlines_Download_rf_income_expenditure_inp.html.pdf` | `http://123.49.32.36:7781/Guidlines/Download/rf_income_expenditure_inp.html` | Non-Profit / Guarantee Company | `financial_statements` | Batch 4 | Summary format for companies not trading for profit. |
| 26 | **Name Clearance Application** | `E:\RJSC\rjsc FROM\RJSC __ Name Clearance Application.pdf` | `http://123.49.32.36:7781/Guidlines/Download/Proforma%20application%20for%20name%20clearance.htm` | Incorporation / Name Change | `company_data` | Batch 4 | Proposed names in order of preference, object clause summary. |
| 27 | **Name Clearance Extension (1st)** | `E:\RJSC\rjsc FROM\New folder\app.roc.gov.bd_Guidlines_Download_nc_time_extension_app1.html.pdf` | `http://123.49.32.36:7781/Guidlines/Download/nc_time_extension_app1.html` | Pre-incorporation | `company_data` | Batch 4 | Requisition for 30-day extension on approved name. |
| 28 | **Name Clearance Extension (2nd)** | `E:\RJSC\rjsc FROM\New folder\app.roc.gov.bd_Guidlines_Download_nc_time_extension_app2.html.pdf` | `http://123.49.32.36:7781/Guidlines/Download/nc_time_extension_app2.html` | Pre-incorporation | `company_data` | Batch 4 | Requisition for final 30-day extension on approved name. |
| 29 | **Application for Certified Copy** | `E:\RJSC\rjsc FROM\New folder\__ R J S C __ Application for Certified Copy.pdf` | `http://123.49.32.36:7781/Guidlines/Download/ic_application.html` | Certified Documents Requisition | `company_data` | Batch 4 | Requisition for certified true copies of registered instruments. |
| 30 | **Winding Up by Court Notice** | `E:\RJSC\rjsc FROM\New folder\__ Winding Up by Court __.pdf` | `N/A (Gazette sample)` | Liquidation / Insolvency | `company_data` | Batch 4 | Filing of certified copy of High Court Division stay order. |
| 31 | **Promoters Meeting Resolution** | `E:\RJSC\rjsc FROM\Microsoft Word - Resulation of Board Metting.doc.pdf` | `N/A (Proforma minutes)` | Pre-incorporation | `work_resolutions` | Batch 4 | Legal format for promoter meeting minutes adopting MOA/AOA. |

---

## 3. Explicit Inventory Findings on Missing Official Reference Samples
Cross-referencing the official RJSC portal downloads catalog (`source_page.html` and `rjsc_links.csv`) with the physical files on disk confirms that **two official forms are currently absent from `E:\RJSC`**:

1. **Form XI** (`reg_form_xi.html`): *Notice of Situation of Office where a Foreign Company Registers*.
   - Statutory Section: Section 379(1)(e), Companies Act, 1994.
   - Status on disk: **MISSING**. No copy exists in `rjsc FROM` or `RJSC_Official_Forms\downloads`.
2. **Form XLII** (`rf_form_xlii.html`): *Notice of Alteration in Names/Addresses of Persons Resident in Bangladesh Authorized to Accept Service for Foreign Company*.
   - Statutory Section: Section 380(1)(c), Companies Act, 1994.
   - Status on disk: **MISSING**. No copy exists in `rjsc FROM` or `RJSC_Official_Forms\downloads`.

All remaining 26 official registration/return forms and all 3 Batch 1 forms (`FORM XII`, `SCHEDULE X`, `FORM 117`) are present, verified, and mapped below.

---

## 4. Three-Layer Document Architecture
To prevent any possibility of altering original reference files, ZA Corporate Desk enforces a strict three-layer architecture:
1. **Layer 1: Original Reference:** Immutable, read-only PDF files stored in `E:\RJSC\rjsc FROM`. These files are never edited or overwritten.
2. **Layer 2: Reviewed Generation Template / Engine:** Clean coordinate definitions and vector rendering logic in `backend/app/services/pdf/forms_engine.py` that strips outdated browser print headers/footers (e.g. `2003` placeholders, `app.roc.gov.bd` print timestamps).
3. **Layer 3: Generated Work-Specific PDF:** Immutable versioned outputs stored in `E:\RJSC\rjsc_work_space\storage\generated_forms\{work_id}\` with unique hashes, audit trails, and version histories (`v1`, `v2`, etc.).
