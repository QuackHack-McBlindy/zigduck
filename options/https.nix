{
  config,
  lib,
  pkgs,
  ...
} : let
  inherit (lib) mkOption types mkEnableOption;
in {

  options.house.https = mkOption {
    type = types.submodule {
      options = {
        dashboard = mkOption {
          type = types.submodule {
            options = {
              url = mkOption {
                type = types.nullOr types.str;
                default = null;
                example = "https://dashboard.my-domain.org";
                description = ''
                  Public HTTPS URL used to access the dashboard.
                  This url is used for a secure API connection.

                  Domain does not need to be publicly accessable, as long as the certificate is valid. 
                  
                  You need a domain name with a valid TLS certificate. 
                  A free dynamic DNS provider such as DuckDNS can be used if you do not already have a domain.
                '';
              };

              urlFile = mkOption {
                type = types.nullOr types.path;
                default = null;
                example = "/run/secrets/dashboard-url";
                description = ''
                  Path to a file containing the public HTTPS URL used to
                  access the dashboard.
                  This url is used for a secure API connection.

                  Domain does not need to be publicly accessable, as long as the certificate is valid. 
                  
                  You need a domain name with a valid TLS certificate. 
                  A free dynamic DNS provider such as DuckDNS can be used if you do not already have a domain.
                '';
              };
            };
          };
          default = {};
          description = "HTTPS configuration for the dashboard.";
        };

        media = mkOption {
          type = types.submodule {
            options = {
              url = mkOption {
                type = types.nullOr types.str;
                default = null;
                example = "https://media.my-domain.org";
                description = ''
                  Public HTTPS URL used to access the media library.

                  The URL must use HTTPS and should point to the web server
                  that serves `house.media.root`.

                  This is required by some media clients, such as Android TV,
                  when accessing external `.m3u` playlists.
                  
                  Domain does not need to be publicly accessable, as long as the certificate is valid. 
                  
                  You need a domain name with a valid TLS certificate. 
                  A free dynamic DNS provider such as DuckDNS can be used if you do not already have a domain.
                '';
              };

              urlFile = mkOption {
                type = types.nullOr types.path;
                default = null;
                example = "/run/secrets/media-url";
                description = ''
                  Path to a file containing the public HTTPS URL used to
                  access the media library.

                  The URL must use HTTPS and should point to the web server
                  that serves `house.media.root`.

                  This is required by some media clients, such as Android TV,
                  when accessing external `.m3u` playlists.
                  
                  Domain does not need to be publicly accessable, as long as the certificate is valid. 
                  
                  You need a domain name with a valid TLS certificate. 
                  A free dynamic DNS provider such as DuckDNS can be used if you do not already have a domain.
                '';
              };
            };
          };
          default = {};
          description = "HTTPS configuration for the media library.";
        };
      };
    };
    default = {};
    description = "HTTPS configuration for the media library";

  };}
