import { sremote } from '@sremote/wrapper';

// [cmt_twitter_adapter]
window.twttr = window.twttr || {};
window.twttr.ready = function (twttr) {
  twttr.widgets.createTweet('20', document.getElementById('tweet-container'), { theme: 'dark', align: 'center' }).then(el => {
    // [cmt_register_adapter_wrapper]
    sremote.adapters.register({
      load: tweetId => {
        const container = document.getElementById('tweet-container');
        if (container) {
          container.innerHTML = '';
          twttr.widgets.createTweet(tweetId, container);
        }
      },
      getState: () => ({ element: el }),
    });
  });
};
