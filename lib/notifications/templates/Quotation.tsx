import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function QuotationTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
