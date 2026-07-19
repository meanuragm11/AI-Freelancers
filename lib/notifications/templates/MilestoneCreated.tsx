import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function MilestoneCreatedTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
