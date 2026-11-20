{
  config,
  lib,
  pkgs,
  en,
  ...
}: let

in {
  yo.scripts.automate.voice =
    lib.mkIf (lib.elem "en" config.house.languages) {
      priority = 4;
      fuzzy.enable = true;
      fuzzy.threshold = 0.6;

      sentences = [
        "when I press {dimmer_gesture} on the dimmer in {dimmer_room} then {actions}"
        "when the door in {door_room} {door_event} then {actions}"
        "when motion is detected in {motion_room} then {actions}"
        "every {schedule_days} at {schedule_time} then {actions}"
        "when {event} then {actions}"
        "when a message arrives on {topic} then {actions}"
      ];

      lists = {
        topic.wildcard = true;
        actions.wildcard = true;

        dimmer_gesture.values = [
          {
            "in" = "on_press_release|press|press the button|tap|tap the button";
            out = "on_press_release";
          }
          {
            "in" = "off_press_release|release|release the button";
            out = "off_press_release";
          }
          {
            "in" = "off_hold_release|hold|hold down|press and hold";
            out = "off_hold_release";
          }
          {
            "in" = "up_press_release|up|press up";
            out = "up_press_release";
          }
          {
            "in" = "down_press_release|down|press down";
            out = "down_press_release";
          }
        ];

        dimmer_room.values = en.rooms;
        door_room.values = en.rooms;
        motion_room.values = en.rooms;

        door_event.values = [
          {
            "in" = "opens|opened|is open";
            out = "door_opened";
          }
          {
            "in" = "closes|closed|is closed";
            out = "door_closed";
          }
        ];

        schedule_days.values = [
          {
            "in" = "weekday|weekdays|monday to friday";
            out = "mon,tue,wed,thu,fri";
          }
          {
            "in" = "weekend|weekends";
            out = "sat,sun";
          }
          {
            "in" = "every day|daily";
            out = "mon,tue,wed,thu,fri,sat,sun";
          }
          {
            "in" = "monday|mon";
            out = "mon";
          }
          {
            "in" = "tuesday|tue";
            out = "tue";
          }
          {
            "in" = "wednesday|wed";
            out = "wed";
          }
          {
            "in" = "thursday|thu";
            out = "thu";
          }
          {
            "in" = "friday|fri";
            out = "fri";
          }
          {
            "in" = "saturday|sat";
            out = "sat";
          }
          {
            "in" = "sunday|sun";
            out = "sun";
          }
        ];

        event.values = [
          {
            "in" = "water leak detected|water is leaking|there is a water leak";
            out = "leak_detected";
          }
          {
            "in" = "smoke alarm triggered|fire detected|there is a fire";
            out = "smoke_detected";
          }
          {
            "in" = "someone arrives home|I arrive home|someone comes home";
            out = "presence_home";
          }
          {
            "in" = "the last person leaves|everyone leaves home|everyone is away";
            out = "presence_away";
          }
          {
            "in" = "the timer goes off|the timer is finished|timer finished";
            out = "timer_finished";
          }
          {
            "in" = "the alarm goes off|the alarm is triggered";
            out = "alarm_triggered";
          }
        ];
      };

    };}
