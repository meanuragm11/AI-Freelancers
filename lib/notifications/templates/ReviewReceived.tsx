import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function ReviewReceivedTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
