chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'JUMP_VIDEO') {
    const video = document.querySelector('video');
    if (video) {
        video.currentTime = request.seconds;
        video.play();
    }
  }
});
