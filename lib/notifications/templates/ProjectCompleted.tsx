import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function ProjectCompletedTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
