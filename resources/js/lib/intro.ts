const INTRO_CLASSES = ['intro-pending', 'intro-glide'];

/**
 * Runs `callback` once the landing intro splash is gone (immediately when it
 * is not playing). Things that animate on first sight, like the stats
 * count-up, must wait for this or they play out behind the splash. Returns a
 * cancel function.
 */
export function whenIntroDone(callback: () => void): () => void {
    const root = document.documentElement;
    const playing = () => INTRO_CLASSES.some((name) => root.classList.contains(name));

    if (!playing()) {
        callback();

        return () => {};
    }

    const watcher = new MutationObserver(() => {
        if (!playing()) {
            watcher.disconnect();
            callback();
        }
    });
    watcher.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => watcher.disconnect();
}
