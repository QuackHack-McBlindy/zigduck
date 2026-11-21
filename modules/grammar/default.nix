# zigduck/modules/grammar/default.nix
# language/grammar config
{
  config,
  lib,
  pkgs,
  ...
}: let
  languages = [ "de" "en" "es" "fr" "sv" ];
  categories = [ "core" "media" "misc" "zigbee" ];

  wordSets = lib.genAttrs
    (builtins.filter
      (lang: builtins.elem lang config.house.languages)
      languages)
    (lang: import (./. + "/${lang}/words.nix"));


  importDir = dir:
    if !builtins.pathExists dir then [ ]
    else if builtins.pathExists (dir + "/default.nix") then [ dir ]
    else
      let
        entries = builtins.readDir dir;
        nixFiles = builtins.attrNames (
          lib.filterAttrs
            (name: type: type == "regular" && lib.hasSuffix ".nix" name)
            entries
        );
      in
        map (name: dir + "/${name}") nixFiles;

  voiceFiles = lib.concatMap (lang:
    let
      langDir = ./. + "/${lang}";
    in
      lib.concatMap (cat: importDir (langDir + "/${cat}")) categories
  ) languages;

  sweep = import ./lib.nix;

in {
  imports = voiceFiles;

  _module.args =
    (lib.genAttrs languages (lang:
      sweep {
        inherit config lib pkgs;
        words = wordSets.${lang};
      }
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
    };

  yo.pronouns = lib.unique (
    lib.concatMap
      (lang: wordSets.${lang}.pronouns or [])
      config.house.languages
  );

  yo.sorryPhrases = lib.unique (
    lib.concatMap
      (lang: wordSets.${lang}.sorryPhrases or [])
      config.house.languages
  );

  yo.splitWords = lib.unique (
    lib.concatMap
      (lang: wordSets.${lang}.splitWords or [])
      config.house.languages

  );}
