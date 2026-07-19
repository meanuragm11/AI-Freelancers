import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function AssetPurchasedTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
