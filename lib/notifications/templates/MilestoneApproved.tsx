import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function MilestoneApprovedTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
