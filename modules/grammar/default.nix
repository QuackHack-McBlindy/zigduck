# zigduck/modules/grammar/default.nix
# language/grammar config
{
  config,
  lib,
  pkgs,
  ...
} : let
  languages = [ "de" "en" "es" "fr" "sv" ];
  categories = [ "core" "media" "misc" "zigbee" ];
  selectedLanguages = config.house.languages or [ "en" ];

  sorryPhrases = lib.concatMap
    (lang:
      let
        wordsFile = ./. + "/${lang}/words.nix";
        words = import wordsFile;
      in
        words.sorryPhrases or []
    )
    selectedLanguages;

  splitWords = lib.concatMap
    (lang:
      let
        wordsFile = ./. + "/${lang}/words.nix";
        words = import wordsFile;
      in
        words.splitWords or []
    )
    selectedLanguages;

  pronouns = lib.concatMap
    (lang:
      let
        wordsFile = ./. + "/${lang}/words.nix";
        words = import wordsFile;
      in
        words.pronouns or []
    )
    selectedLanguages;

  importDir = dir:
    if !builtins.pathExists dir then [ ]
    else if builtins.pathExists (dir + "/default.nix") then [ dir ]
    else
      let
        entries  = builtins.readDir dir;
        nixFiles = builtins.attrNames (
          lib.filterAttrs
            (name: type: type == "regular" && lib.hasSuffix ".nix" name)
            entries
        );
      in map (name: dir + "/${name}") nixFiles;

  voiceFiles = lib.concatMap (lang:
    let langDir = ./. + "/${lang}";
    in lib.concatMap (cat: importDir (langDir + "/${cat}")) categories
  ) languages;

  sweep = import ./lib.nix;

in {
  imports = voiceFiles;

  yo.sorryPhrases = sorryPhrases;
  yo.splitWords   = splitWords;
  yo.pronouns     = pronouns;

  _module.args =
    (lib.genAttrs languages (lang:
      sweep { inherit config lib pkgs; words = import (./. + "/${lang}/words.nix"); }
    ))
    // {
      allowFrom = scriptName: listName:
        let
          def =
            config.yo.scripts.${scriptName}.voice.lists.${listName} or {};

          expand = v:
            let
              output = v.out;
            in
              lib.splitString "|" (v."in" or output);

        in
          if (def.wildcard or false) then []
          else lib.unique (lib.concatMap expand (def.values or []));

    };}
