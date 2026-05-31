# Ticket: Explore BPM detection via Song Recognition

## Context
Our current BPM detection relies on signal processing directly on audio extracted from videos. This approach is prone to errors with background noise or complex audio. We want to investigate if identifying the song first and then looking up its BPM from a database would yield higher accuracy.

## Goals
- Investigate APIs/services for song recognition (e.g., ACRCloud, AudD, Shazam API).
- Determine feasibility of integrating these services into our current workflow.
- Evaluate the cost, latency, and accuracy trade-offs compared to signal processing.

## Action Items
- [ ] Research available song recognition APIs.
- [ ] Create a small proof-of-concept for audio fingerprinting and matching.
- [ ] Perform comparative accuracy analysis on our test dataset.
- [ ] Determine if BPM metadata is reliable and accessible via these services.
- [ ] Present findings and recommend whether to pursue this approach.
