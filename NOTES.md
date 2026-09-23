# Notes

## Server

- Stream the run over SSE instead of returning one JSON blob at the end.
- Dropped the editor pass — first token ~15s → ~3s, one model call instead of two.
- Pass conversation history, so follow-ups resolve.
- Run independent tool calls in parallel — 5 lookups: ~4s → ~800ms.
- Resolve companies by ticker, casing or typo; "Acme" asks which one instead of guessing.
- Grounding rules: cite tools only, surface unfiled and restated data.

## Client

- Stream the answer and show each tool call as it runs.
- Render answers as markdown so tables read properly.
- Sidebar with multiple threads — each owns its history, run and queue.
- Queue questions asked while a run is in flight.
- Data page with citation links from the figures in an answer.

## Structure

- Split by runtime: `server/`, `client/`, `shared/` for what crosses the wire.

## Quality

- `npm run eval` — checks answers on the questions that matter.
- `npm run bench` — times each question against a saved baseline.
- Unit tests for company resolution; every citation link is checked against what the data page can open.

## Not done

- `searchDocuments` is a naive substring match; a miss returns an empty list with no explanation.
- The agent loop has no tests.
- Hitting the iteration limit returns a preset apology instead of answering from what it found.
- Repeated tool calls aren't deduped.

## I didn't get to

- An AI judge for the evals
- Highlighting the cited row or document when a link opens it
- Fully testing and proving out the evals and benchmarks
