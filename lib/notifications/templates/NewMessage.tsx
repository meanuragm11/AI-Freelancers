import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function NewMessageTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
