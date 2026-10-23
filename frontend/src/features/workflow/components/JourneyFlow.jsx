import { Badge } from '../../../components/ui';

export default function JourneyFlow({ steps }) {
  return (
    <ol className="wf-journey">
      {steps.map((step, i) => (
        <li key={step.id}>
          <span className="wf-journey-num">{i + 1}</span>
          <div className="wf-journey-body">
            <div className="wf-journey-title">
              <strong>{step.title}</strong>
              <Badge tone={step.tag === 'Auto' ? 'green' : 'neutral'}>{step.tag}</Badge>
            </div>
            <p className="muted">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
