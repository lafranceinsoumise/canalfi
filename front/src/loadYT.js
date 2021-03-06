function loadScript (src) {
  const head = document.head || document.getElementsByTagName('head')[0];
  const script = document.createElement('script');

  script.type = 'text/javascript';
  script.async = true;
  script.src = src;
  const promise = new Promise((resolve, reject) => {
    script.onload = () => { script.onerror = script.onload = null; resolve(script); };
    script.onerror = () => { script.onerror = script.onload = null; reject(new Error('Failed to load ' + src)); };
  });
  head.appendChild(script);
  return promise;
}

function YTready() {
  return new Promise((resolve) => window.YT.ready(() => resolve(window.YT)));
}

async function loadYT() {
  if (!(typeof window.YT === 'object') || !(typeof window.YT.ready === 'function')) {
    await loadScript('https://www.youtube.com/iframe_api');
  }

  return await YTready();
}

let YTPromise = null;

let loadedCastSender = false;
export async function getCast() {
  if (!loadedCastSender) {
    await loadScript('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1');
    loadedCastSender = true;
  }

  return window.cast;
}

export function getYT() {
  if (!YTPromise) {
    YTPromise = loadYT();
  }
  return YTPromise;
}

let loadedCastReceiver = false;
export async function getCastReceiver() {
  if (!loadedCastReceiver) {
    await loadScript('https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js');
    loadedCastReceiver = true;
  }

  return window.cast;
}