{
  config,
  lib,
  pkgs,
  sv,
  ...
} : let

in {

  yo.scripts.automate.voice = lib.mkIf (lib.elem "sv" config.house.languages) {
    priority = 4;
    fuzzy.enable = true;
    fuzzy.threshold = 0.6;

    sentences = [
      "när jag trycker på {dimmer_gesture} på dimmern i {dimmer_room} så {actions}"
      "när dörren i {door_room} {door_event} så {actions}"
      "när någon rör sig i {motion_room} så {actions}"
      "varje {schedule_days} klockan {schedule_time} så {actions}"
      "när {event} så {actions}"
      "när ett meddelande kommer på {topic} så {actions}"
    ];

    lists = {
      topic.wildcard   = true;
      actions.wildcard = true;
      dimmer_gesture.values = [
        { "in" = "on_press_release|pär-knappen|på-knappen|trycker på|tryck på"; out = "on_press_release"; }
        { "in" = "off_press_release|av-knappen|släpper";                          out = "off_press_release"; }
        { "in" = "off_hold_release|håller in|håll in";                            out = "off_hold_release"; }
        { "in" = "up_press_release";                                              out = "up_press_release"; }
        { "in" = "down_press_release";                                            out = "down_press_release"; }
      ];

      # Rooms — reuse the existing list; no duplication
      dimmer_room.values = sv.rooms;
      door_room.values   = sv.rooms;
      motion_room.values = sv.rooms;

      # Door event — canonicalise to what room_actions expects
      door_event.values = [
        { "in" = "öppnas|öppnades|öppnad"; out = "door_opened"; }
        { "in" = "stängs|stängdes|stängd"; out = "door_closed"; }
      ];

      # Schedule days — sv should already have this; if not, inline
      schedule_days.values = [
        { "in" = "vardag|vardagar|mån-fre";                  out = "mon,tue,wed,thu,fri"; }
        { "in" = "helg|helgen|helger|lör-sön";               out = "sat,sun"; }
        { "in" = "varje dag|dagligen";                       out = "mon,tue,wed,thu,fri,sat,sun"; }
        { "in" = "måndag|mån";   out = "mon"; }
        { "in" = "tisdag|tis";   out = "tue"; }
        { "in" = "onsdag|ons";   out = "wed"; }
        { "in" = "torsdag|tor";  out = "thu"; }
        { "in" = "fredag|fre";   out = "fri"; }
        { "in" = "lördag|lör";   out = "sat"; }
        { "in" = "söndag|sön";   out = "sun"; }
      ];

      # Events — canonical names matching your global_actions / presence keys
      event.values = [
        { "in" = "vattenlarmet larmar|vattnet läcker|det läcker vatten"; out = "leak_detected"; }
        { "in" = "brandlarmet larmar|det brinner|brand";                  out = "smoke_detected"; }
        { "in" = "någon kommer hem|jag kommer hem";                       out = "presence_home"; }
        { "in" = "sista personen går hemifrån|alla går hemifrån";         out = "presence_away"; }
        { "in" = "timern ringer|timern är klar";                          out = "timer_finished"; }
        { "in" = "alarmet ringer";                                        out = "alarm_triggered"; }
      ];
    };

  };}
