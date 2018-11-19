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


export async function getCast() {
  if (!(typeof window.cast === 'object') || !(typeof window.cast.framework.CastContext === 'object')) {
    await loadScript('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1');
  }

  return window.cast;
}

export function getYT() {
  if (!YTPromise) {
    YTPromise = loadYT();
  }
  return YTPromise;
}
