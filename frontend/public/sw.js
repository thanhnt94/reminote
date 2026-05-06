self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/static/favicon.ico',
      badge: '/static/favicon.ico',
      data: {
        url: data.url || '/'
      },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Review Now' },
        { action: 'close', title: 'Dismiss' }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'RemiNote', options)
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})
