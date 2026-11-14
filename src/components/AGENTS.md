## Opening screen
- Keep the uploaded opening image in one root-mounted splash, with a bounded dismissal timer and no replay during route navigation, so it cannot trap visitors or disrupt page flows.
- Keep public navigation in a separate desktop row and a mobile menu; defer deduplicated bottom-nav height writes to animation frames to prevent ResizeObserver feedback loops.