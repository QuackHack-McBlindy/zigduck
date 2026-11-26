{
  self,
  lib,
  config,
  pkgs,
  ...
} : let

in {
  yo.scripts.time = {
    description = "Tells time, day, date & week";
    category = "Misc";
    code = ''
      export LC_TIME=sv_SE.UTF-8
      TIME=$(date "+%H . %M")
      DAY=$(date "+%A")
      DATE=$(date "+%d %B")
      WEEK=$(date +%V)
      echo "$TIME_TEXT $TIME . $DATE_TEXT $DATE $WEEK_TEXT $WEEK"
      yo say "$TIME_TEXT $TIME. $DATE_TEXT $DATE $WEEK_TEXT $WEEK"
    '';

  };}
