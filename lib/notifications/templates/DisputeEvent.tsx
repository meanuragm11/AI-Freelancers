import * as React from 'react';
import type { EmailTemplateData } from '../types';
import { BaseTemplate } from './BaseTemplate';

export function DisputeEventTemplate(props: EmailTemplateData) {
  return <BaseTemplate {...props} />;
}
