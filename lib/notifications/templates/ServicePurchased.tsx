import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function ServicePurchasedTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
