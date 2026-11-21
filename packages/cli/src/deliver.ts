import { applyDraft } from './apply.ts';
import { type AgentResponse, assertDraftWritable } from './response.ts';
import { renderReview } from './review.ts';

interface DeliveryOptions {
  yes: boolean;
  stdout: Pick<NodeJS.WriteStream, 'write'>;
  stderr: Pick<NodeJS.WriteStream, 'write'>;
  ask?: (message: string) => Promise<string>;
}

export async function deliverDraft(
  draft: AgentResponse,
  destination: string,
  previous: string | undefined,
  options: DeliveryOptions
): Promise<void> {
  const review = renderReview(draft, destination, previous);
  options.stderr.write(`${review.notes}\n`);
  const preview = review.preview.endsWith('\n') ? review.preview : `${review.preview}\n`;
  options.stdout.write(options.ask ? preview : draft.markdown);

  assertDraftWritable(draft);
  const ask = options.ask;
  if (options.yes || ask) {
    await applyDraft(
      draft,
      destination,
      previous,
      options.yes,
      ask ? async () => /^y(es)?$/i.test((await ask('Write this draft? [y/N] ')).trim()) : undefined
    );
  }
}
