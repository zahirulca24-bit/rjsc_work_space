import { DeadlineRule, EntityType } from './types';

export const deadlineRules: DeadlineRule[] = [
  {
    id: 'DEADLINE_SOC_ANNUAL_LIST',
    serviceId: 'society-return-filing',
    entityType: EntityType.SOCIETY,
    trigger: 'AGM date',
    daysAfterTrigger: 14,
    fixedRuleText: 'Within 14 days after AGM. If rules do not provide an AGM: filing in January.',
    sourceReference: 'SRA_1860_SEC_4'
  }
];

export const getDeadlineRuleForService = (serviceId: string, entityType: EntityType): DeadlineRule | undefined => {
  return deadlineRules.find(r => r.serviceId === serviceId && (r.entityType === entityType || r.entityType === 'ALL'));
};
