import { EntityType, DocumentRequirement, FeeRule, DeadlineRule, LegalReference, RJSCServiceRule } from './types';
import { getServiceRuleById } from './services';
import { getDocumentRulesForService } from './document-rules';
import { getFeeRuleForService, feeRules } from './fee-rules';
import { getDeadlineRuleForService } from './deadline-rules';
import { legalReferences } from './legal-references';

export interface FeeCalculationParams {
  serviceId: string;
  entityType: EntityType;
  documentCount?: number;
  authorizedCapital?: number;
  securedAmount?: number;
  yearsLate?: number;
  effectiveDate?: string;
  certifiedCopyType?: 'memorandum' | 'articles' | 'other' | 'incorporation' | 'commencement' | 'any' | 'comparison' | 'inspection';
}

export interface FeeCalculationResult {
  totalFee: number;
  breakdown: Record<string, number>;
  sourceReference: string;
  ruleId: string;
}

export const getServiceRule = (serviceId: string, entityType: EntityType): RJSCServiceRule | null => {
  return getServiceRuleById(serviceId, entityType) || null;
};

export const getRequiredDocuments = (serviceId: string, entityType: EntityType): DocumentRequirement[] => {
  return getDocumentRulesForService(serviceId, entityType);
};

export const getFeeRule = (serviceId: string, entityType: EntityType, effectiveDate?: string): FeeRule | null => {
  let relevantRules = feeRules.filter(r => r.serviceId === serviceId);

  if (effectiveDate) {
    relevantRules = relevantRules.filter(r => {
      const fromValid = r.effectiveFrom <= effectiveDate;
      const toValid = r.effectiveTo === null || effectiveDate <= r.effectiveTo;
      return fromValid && toValid;
    });
  } else {
    relevantRules = relevantRules.filter(r => r.effectiveTo === null);
  }

  const specificRule = relevantRules.find(r => r.entityType === entityType);
  if (specificRule) return specificRule;

  const fallbackRule = relevantRules.find(r => r.entityType === 'ALL');
  return fallbackRule || null;
};

export const getDeadlineRule = (serviceId: string, entityType: EntityType): DeadlineRule | null => {
  return getDeadlineRuleForService(serviceId, entityType) || null;
};

export const getLegalReferences = (serviceId: string, entityType: EntityType): LegalReference[] => {
  const service = getServiceRule(serviceId, entityType);
  if (!service) return [];
  return service.legalReferences
    .map(refId => legalReferences[refId])
    .filter(Boolean);
};

export const calculateRJSCFee = (params: FeeCalculationParams): FeeCalculationResult | null => {
  const { serviceId, entityType, documentCount = 1, authorizedCapital = 0, securedAmount = 0, yearsLate = 0, effectiveDate, certifiedCopyType } = params;
  
  const rule = getFeeRule(serviceId, entityType, effectiveDate);
  if (!rule) {
    return null;
  }

  let totalFee = 0;
  const breakdown: Record<string, number> = {};

  if (rule.calculationType === 'PER_DOCUMENT' || rule.calculationType === 'PER_FORM') {
    const feePerDoc = rule.perDocumentFee || 0;
    const baseAmount = feePerDoc * documentCount;
    totalFee += baseAmount;
    breakdown['Base Fee'] = baseAmount;

    if (yearsLate > 0 && rule.lateFeeRules) {
      let lateFee = 0;
      const { upToYears, feePerYear, beyondYears, feeBeyondPerYear } = rule.lateFeeRules;
      
      if (yearsLate <= upToYears) {
        lateFee = yearsLate * feePerYear;
      } else {
        lateFee = (upToYears * feePerYear);
        if (beyondYears && feeBeyondPerYear) {
          const extraYears = yearsLate - upToYears;
          lateFee += extraYears * feeBeyondPerYear;
        }
      }
      totalFee += lateFee;
      breakdown['Late Fee'] = lateFee;
    }
    
    return {
      totalFee,
      breakdown,
      sourceReference: rule.sourceReference,
      ruleId: rule.id
    };
  }

  if (rule.calculationType === 'FIXED') {
    const baseAmount = rule.baseFee || 0;
    const extraDocsFee = (rule.perDocumentFee || 0) * documentCount;
    totalFee = baseAmount + extraDocsFee;
    breakdown['Fixed Fee'] = baseAmount;
    if (extraDocsFee > 0) {
      breakdown['Filing Fee'] = extraDocsFee;
    }
    
    return {
      totalFee,
      breakdown,
      sourceReference: rule.sourceReference,
      ruleId: rule.id
    };
  }

  if (rule.calculationType === 'CERTIFIED_COPY' && rule.certifiedCopyRules) {
    const cr = rule.certifiedCopyRules;
    if (certifiedCopyType === 'memorandum') {
      totalFee = cr.memorandumStampFee;
      breakdown['Memorandum Stamp Fee'] = totalFee;
    } else if (certifiedCopyType === 'articles') {
      totalFee = cr.articlesStampFee;
      breakdown['Articles Stamp Fee'] = totalFee;
    } else if (certifiedCopyType === 'other') {
      totalFee = cr.otherDocumentStampFee;
      breakdown['Other Document Stamp Fee'] = totalFee;
    } else if (certifiedCopyType === 'incorporation') {
      totalFee = cr.incorporationCertificateCopy;
      breakdown['Incorporation Certificate Copy'] = totalFee;
    } else if (certifiedCopyType === 'commencement') {
      totalFee = cr.commencementCertificateCopy;
      breakdown['Commencement Certificate Copy'] = totalFee;
    } else if (certifiedCopyType === 'any') {
      totalFee = cr.copyOfAnyDocument;
      breakdown['Copy of Any Document'] = totalFee;
    } else if (certifiedCopyType === 'comparison') {
      totalFee = cr.comparisonWithOriginal;
      breakdown['Comparison With Original'] = totalFee;
    } else if (certifiedCopyType === 'inspection') {
      totalFee = entityType === EntityType.SOCIETY ? cr.recordInspection.society : cr.recordInspection.default;
      breakdown['Record Inspection'] = totalFee;
    } else {
      totalFee = cr.copyOfAnyDocument;
      breakdown['Certified Copy Base'] = totalFee;
    }
    
    return {
      totalFee,
      breakdown,
      sourceReference: rule.sourceReference,
      ruleId: rule.id
    };
  }

  if (rule.calculationType === 'COMPLEX_COMPANY_REGISTRATION' && rule.registrationRules) {
    const rr = rule.registrationRules;
    
    const memoFee = rr.memorandumStampFee;
    breakdown['Memorandum Stamp Fee'] = memoFee;
    totalFee += memoFee;
    
    let articlesFee = 0;
    for (const slab of rr.articlesStampSlabs) {
      if (slab.max === null) {
        if (authorizedCapital >= slab.min) {
          articlesFee = slab.fee;
          break;
        }
      } else if (authorizedCapital >= slab.min && authorizedCapital <= slab.max) {
        articlesFee = slab.fee;
        break;
      }
    }
    breakdown['Articles Stamp Fee'] = articlesFee;
    totalFee += articlesFee;
    
    const filingFee = rr.filingFeePerDocument * rr.filingDocumentCount;
    breakdown['Filing Fee'] = filingFee;
    totalFee += filingFee;
    
    let capitalFee = 0;
    for (const slab of rr.capitalFeeSlabs) {
      if (authorizedCapital > slab.min) {
        const applicableCapital = slab.max ? Math.min(authorizedCapital, slab.max) - slab.min : authorizedCapital - slab.min;
        if (applicableCapital > 0 && slab.perUnit > 0) {
           const units = Math.ceil(applicableCapital / slab.unitSize);
           capitalFee += units * slab.perUnit;
        }
      }
    }
    breakdown['Authorized Capital Fee'] = capitalFee;
    totalFee += capitalFee;
    
    return {
      totalFee,
      breakdown,
      sourceReference: rule.sourceReference,
      ruleId: rule.id
    };
  }

  if (rule.calculationType === 'NAME_CLEARANCE') {
    const baseAmount = rule.baseFee || 0;
    let vatAmount = 0;
    breakdown['Clearance Fee'] = baseAmount;
    
    if (rule.vatApplicable) {
      vatAmount = baseAmount * 0.15;
      breakdown['VAT (15%)'] = vatAmount;
    }
    
    totalFee = baseAmount + vatAmount;
    
    return {
      totalFee,
      breakdown,
      sourceReference: rule.sourceReference,
      ruleId: rule.id
    };
  }

  if (rule.calculationType === 'MORTGAGE_SLAB' && rule.mortgageRules) {
    const mr = rule.mortgageRules;
    const securedAmt = params.securedAmount || 0; // Using securedAmount parameter instead of authorizedCapital
    
    totalFee = mr.firstSlabBase;
    breakdown['Base Fee (Up to 5L)'] = mr.firstSlabBase;
    
    if (securedAmt > 500000) {
      const amountAbove5L = securedAmt - 500000;
      const amountInSecondSlab = Math.min(amountAbove5L, 4500000); // 50L - 5L = 45L
      
      if (amountInSecondSlab > 0 && mr.secondSlabPerUnit > 0) {
        const units = Math.ceil(amountInSecondSlab / mr.unitSize);
        const secondSlabFee = units * mr.secondSlabPerUnit;
        breakdown[`Fee for next 45L (@ ${mr.secondSlabPerUnit} per 5L)`] = secondSlabFee;
        totalFee += secondSlabFee;
      }
      
      if (securedAmt > 5000000) {
        const amountAbove50L = securedAmt - 5000000;
        if (amountAbove50L > 0 && mr.thirdSlabPerUnit > 0) {
          const units = Math.ceil(amountAbove50L / mr.unitSize);
          const thirdSlabFee = units * mr.thirdSlabPerUnit;
          breakdown[`Fee above 50L (@ ${mr.thirdSlabPerUnit} per 5L)`] = thirdSlabFee;
          totalFee += thirdSlabFee;
        }
      }
    }
    
    return {
      totalFee,
      breakdown,
      sourceReference: rule.sourceReference,
      ruleId: rule.id
    };
  }

  return null;
};
