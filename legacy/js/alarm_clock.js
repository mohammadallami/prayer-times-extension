/**
 * Prayer Alarm Clock Calculations.
 *
 * Contributed by:
 *   Dmitri Babaev
 *   Emad Al-Shihabi
 *   Mohamed Mansour
 */
AlarmClock = function (entity) {
  this.entity = entity;
  this.times = null;
  this.nowPrayerTimeLabel = chrome.i18n.getMessage('nowPrayerTime');
  this.prayerTimeNames = settings.timenames;
  this.nextPrayerTime = null;
  this.alarmActive = false;
  this.athanNotificationId = 'notification-id';
  this.athanPlayer = new AthanPlayer();

  chrome.notifications.onClicked.addListener(callback => {
    this.athanPlayer.stopAthan();
    chrome.notifications.clear(this.athanNotificationId);
  })
};

/**
 * Sets the athan sound for this alaram.
 * @param{string} audioValue The alarm sound text.
 */
AlarmClock.prototype.setAthan = function (audioValue) {
  var audioSource = audioValue.substring(1);
  var audioType = audioValue.substring(0, 1) == '1' ? 'Shia' : 'Sunni';
  this.athanPlayer.setAthanTrack(audioType, audioSource);
};

/**
 * Update the local cache of the prayer time names.
 */
AlarmClock.prototype.setPrayerTimeNames = function (times) {
  this.prayerTimeNames = times;
};

/**
 * Resets the Alarm Clock to Fajr.
 */
AlarmClock.prototype.reset = function () {
  this.times = this.entity.getTimes(null, '24h');
  var timeName = this.prayerTimeNames[0];
  var time = this.times[timeName.toLowerCase()];
  this.nextPrayerTime = {
    time: time,
    name: timeName,
    delta: (1.0 * this.dateStringInMinutes(time) + 24 * 60 - this.currentTimeInMinutes())
  };
};

/**
 * Starts the Alarm Clock to figure out when the next prayer is.
 */
AlarmClock.prototype.start = function () {
  this.reset();
  // Current time in minutes from day beginning
  var crMinutes = this.currentTimeInMinutes();
  var delta = -1;
  for (var i in this.prayerTimeNames) {
    var timeName = this.prayerTimeNames[i];
    var time = this.times[timeName.toLowerCase()];

    // Prayer time in minutes from day beginning.
    var prMinutes = this.dateStringInMinutes(time);
    delta = prMinutes - crMinutes;

    // If delta became > 0 then we found next prayer.
    if (delta >= 0) {
      this.nextPrayerTime.delta = delta;
      this.nextPrayerTime.name = timeName;
      this.nextPrayerTime.time = time;

      // It is time to show the notification!
      if (delta == 0) {
        if (!this.alarmActive) {
          var prayerNotificationLabel = this.nowPrayerTimeLabel;
          this.makeAlarm(this.getNextPrayerName(), prayerNotificationLabel + ' ' + this.getNextPrayerName());
          this.alarmActive = true;
        }
      } else {
        this.alarmActive = false;
      }

      break;
    }
  }
  this.makeBadge();
  window.setTimeout(() => this.start(), 4000);
};

/**
 * The Current Time in Minutes.
 */
AlarmClock.prototype.currentTimeInMinutes = function () {
  var d = new Date();
  var h = d.getHours();
  var m = d.getMinutes();
  return 60 * h + m;
};

/**
 * From the given date string, returns the number of minutes.
 */
AlarmClock.prototype.dateStringInMinutes = function (s) {
  var h = 1.0 * s.split(':')[0];
  var m = 1.0 * s.split(':')[1];
  return 60 * h + m;
};

/**
 * Creates the HTML5 Notification payload and shows it.
 *
 * @param {string} title The title of the HTML5 notification.
 * @param {string} body The description that will be shown in the body of the 
 *                      notification.
 */
AlarmClock.prototype.makeAlarm = function (title, body) {
  if (!settings.notificationVisible) {
    return;
  }

  chrome.notifications.create(this.athanNotificationId, {
    type: 'basic',
    iconUrl: 'img/icon48.png',
    title: title,
    message: body,
    requireInteraction: false
  }, (callback) => {
    if (settings.athanVisible) {
      this.athanPlayer.playAthan();
    }
  });
};

/**
 * Creates and updates the Chrome Badge Text.
 * Always change the title, but decide whether to show the badge.
 */
AlarmClock.prototype.makeBadge = function () {
  chrome.browserAction.setTitle({
    title: this.getNextPrayerName()
  });

  if (!settings.badgeVisible) {
    return;
  }

  chrome.browserAction.setBadgeText({
    text: this.getNextPrayerTime()
  });
};

/**
 * Formatted time to next prayer
 */
AlarmClock.prototype.getNextPrayerTime = function () {
  var h = Math.floor(this.nextPrayerTime.delta / 60);
  var m = this.nextPrayerTime.delta - 60 * h;
  var s = (m < 10) ? (h + ':0' + m) : (h + ':' + m);
  return s;
};

/**
 * Name of next prayer
 */
AlarmClock.prototype.getNextPrayerName = function () {
  return this.nextPrayerTime.name;
};