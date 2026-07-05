import { BaseTemplate } from './BaseTemplate';
import type { EmailTemplateData } from '../types';

export function ProjectRequestTemplate(props: EmailTemplateData) {
  return (
    <BaseTemplate
      type={props.type}
      heading={props.heading}
      projectName={props.projectName}
      projectStatus={props.projectStatus ?? 'Pending review'}
      dateTime={props.dateTime}
      content={props.content}
      primaryCtaLabel={props.primaryCtaLabel}
      primaryCtaHref={props.primaryCtaHref}
      secondaryCtaLabel={props.secondaryCtaLabel}
      secondaryCtaHref={props.secondaryCtaHref}
    />
  );
}
