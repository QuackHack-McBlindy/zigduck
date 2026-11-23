{
  config,
  lib,
  pkgs,
  de,
  ...
} : let

in {

  yo.scripts.automate.voice = lib.mkIf (lib.elem "de" config.house.languages) {
    sentences = [
      "wenn ich am Dimmer in {dimmer_room} {dimmer_gesture} betätige, dann {actions}"
      "wenn die Tür in {door_room} {door_event}, dann {actions}"
      "wenn sich jemand in {motion_room} bewegt, dann {actions}"
      "immer {schedule_days} um {schedule_time} Uhr, dann {actions}"
      "wenn {event}, dann {actions}"
      "wenn eine Nachricht auf {topic} eingeht, dann {actions}"
    ];

    lists = {
      topic.wildcard   = true;
      actions.wildcard = true;
      dimmer_gesture.values = [
        { "in" = "on_press_release|beim Drücken|Taste drücken|drücke|drück"; out = "on_press_release"; }
        { "in" = "off_press_release|Aus-Taste|loslassen|lasse los";                          out = "off_press_release"; }
        { "in" = "off_hold_release|gedrückt halten|halte gedrückt";                            out = "off_hold_release"; }
        { "in" = "up_press_release";                                              out = "up_press_release"; }
        { "in" = "down_press_release";                                            out = "down_press_release"; }
      ];

      # Rooms — reuse the existing list; no duplication
      dimmer_room.values = de.rooms;
      door_room.values   = de.rooms;
      motion_room.values = de.rooms;

      # Door event — canonicalise to what room_actions expects
      door_event.values = [
        { "in" = "öffnet sich|wurde geöffnet|geöffnet"; out = "door_opened"; }
        { "in" = "schließt sich|wurde geschlossen|geschlossen"; out = "door_closed"; }
      ];

      # Schedule days — sv should already have this; if not, inline
      schedule_days.values = [
        { "in" = "werktags|an Werktagen|Mo-Fr";                  out = "mon,tue,wed,thu,fri"; }
        { "in" = "am Wochenende|am Wochenende|an Wochenenden|Sa-So";               out = "sat,sun"; }
        { "in" = "täglich|jeden Tag";                       out = "mon,tue,wed,thu,fri,sat,sun"; }
        { "in" = "montags|jeden Montag|Mo";   out = "mon"; }
        { "in" = "dienstags|jeden Dienstag|Di";   out = "tue"; }
        { "in" = "mittwochs|jeden Mittwoch|Mi";   out = "wed"; }
        { "in" = "donnerstags|jeden Donnerstag|Do";  out = "thu"; }
        { "in" = "freitags|jeden Freitag|Fr";   out = "fri"; }
        { "in" = "samstags|jeden Samstag|Sa";   out = "sat"; }
        { "in" = "sonntags|jeden Sonntag|So";   out = "sun"; }
      ];

      # Events — canonical names matching your global_actions / presence keys
      event.values = [
        { "in" = "der Wasser-Alarm schlägt an|Wasser tritt aus|es tritt Wasser aus"; out = "leak_detected"; }
        { "in" = "der Rauchmelder schlägt Alarm|es brennt|Feuer";                  out = "smoke_detected"; }
        { "in" = "jemand kommt nach Hause|ich komme nach Hause";                       out = "presence_home"; }
        { "in" = "die letzte Person verlässt das Haus|alle verlassen das Haus";         out = "presence_away"; }
        { "in" = "der Timer klingelt|der Timer ist fertig";                          out = "timer_finished"; }
        { "in" = "der Alarm klingelt";                                        out = "alarm_triggered"; }
      ];
    };

  };}
