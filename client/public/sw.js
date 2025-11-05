self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const type = data.type || 'generic';
  let title = '555Dating';
  let body = data.body || 'You have a new notification.';

  if (type === 'match') {
    title = 'New match!';
    body = `${data.displayName || 'Someone'} matched with you.`;
  } else if (type === 'message') {
    title = data.displayName ? `${data.displayName} sent a message` : 'New message';
    body = data.preview || 'Open the app to reply.';
  }

  const options = {
    body,
    data,
    vibrate: [100, 50, 100]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetPath = data.type === 'message' && data.fromId
    ? `/messages/${data.fromId}`
    : data.type === 'match' && data.userId
      ? `/messages/${data.userId}`
      : '/';

  event.waitUntil((async () => {
    const url = new URL(targetPath, self.location.origin).href;
    const tabs = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of tabs) {
      if (client.url === url && 'focus' in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(url);
    }
    return undefined;
  })());
});
