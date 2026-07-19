import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function ProjectRequestTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
