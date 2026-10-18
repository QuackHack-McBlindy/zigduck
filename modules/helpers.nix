{
  config,
  lib,
  pkgs,
  ...
} : let

  cmdHelpers = ''
    say_duck() {
      echo -e "\e[3m\e[38;2;0;150;150m🦆 duck say \e[1m\e[38;2;255;255;0m⮞\e[0m\e[3m\e[38;2;0;150;150m $1\e[0m"
    }

    color2hex() {
      local color="$1"
      declare -A color_ranges=(
        ["red"]="255,0,0:165,0,0"
        ["green"]="0,255,0:0,100,0"
        ["blue"]="0,0,255:0,0,165"
        ["yellow"]="255,255,0:200,200,0"
        ["orange"]="255,165,0:205,100,0"
        ["purple"]="128,0,128:80,0,80"
        ["pink"]="255,192,203:220,150,160"
        ["white"]="255,255,255:240,240,240"
        ["black"]="10,10,10:0,0,0"
        ["gray"]="160,160,160:80,80,80"
        ["brown"]="165,42,42:120,30,30"
        ["cyan"]="0,255,255:0,200,200"
        ["magenta"]="255,0,255:180,0,180"
      )
      local r g b
      if [[ -z "$color" || "$color" == "random" || -z "''${color_ranges[''$color]}" ]]; then
        r=$(( RANDOM % 256 ))
        g=$(( RANDOM % 256 ))
        b=$(( RANDOM % 256 ))
      else
        IFS=':' read -r min_range max_range <<< "''${color_ranges[$color]}"
        IFS=',' read -r min_r min_g min_b <<< "$min_range"
        IFS=',' read -r max_r max_g max_b <<< "$max_range"
        r=$(( min_r + RANDOM % (max_r - min_r + 1) ))
        g=$(( min_g + RANDOM % (max_g - min_g + 1) ))
        b=$(( min_b + RANDOM % (max_b - min_b + 1) ))
      fi
      printf "%02x%02x%02x\n" "$r" "$g" "$b"
    }

    color2xy() {
      local color="$1"
      declare -A color_ranges=(
        ["red"]="0.675,0.322:0.692,0.308"
        ["green"]="0.17,0.7:0.214,0.709"
        ["blue"]="0.14,0.08:0.153,0.048"
        ["yellow"]="0.452,0.47:0.507,0.472"
        ["orange"]="0.6,0.38:0.62,0.37"
        ["purple"]="0.28,0.13:0.265,0.11"
        ["pink"]="0.35,0.28:0.38,0.3"
        ["white"]="0.3227,0.329:0.313,0.337"
        ["black"]="0.15,0.08:0.12,0.06"
        ["gray"]="0.3227,0.329:0.3,0.31"
        ["brown"]="0.6,0.34:0.62,0.32"
        ["cyan"]="0.16,0.23:0.18,0.25"
        ["magenta"]="0.38,0.18:0.4,0.2"
        ["coolwhite"]="0.31,0.32:0.29,0.3"
        ["warmwhite"]="0.44,0.41:0.46,0.43"
        ["neutralwhite"]="0.35,0.35:0.37,0.37"
      )
      local x y

      if [[ -z "$color" || "$color" == "random" || -z "''${color_ranges[$color]}" ]]; then
        x=$(LC_ALL=C awk -v seed=$RANDOM 'BEGIN {srand(seed); printf "%.4f\n", 0.1 + rand() * 0.6}')
        y=$(LC_ALL=C awk -v seed=$RANDOM 'BEGIN {srand(seed); printf "%.4f\n", 0.05 + rand() * 0.6}')
      else
        IFS=':' read -r min_range max_range <<< "''${color_ranges[$color]}"
        IFS=',' read -r min_x min_y <<< "$min_range"
        IFS=',' read -r max_x max_y <<< "$max_range"

        x=$(LC_ALL=C awk -v min="$min_x" -v max="$max_x" -v seed=$RANDOM 'BEGIN {srand(seed); printf "%.4f\n", min + rand() * (max - min)}')
        y=$(LC_ALL=C awk -v min="$min_y" -v max="$max_y" -v seed=$RANDOM 'BEGIN {srand(seed); printf "%.4f\n", min + rand() * (max - min)}')
      fi

      LC_ALL=C awk -v x="$x" -v y="$y" 'BEGIN {printf "[%.4f,%.4f]\n", x, y}'
    }

    hex_to_xy() {
      local hex="$1"
      local r g b
      hex=$(echo "$hex" | sed 's/^#//')
      [[ ''${#hex} -eq 6 ]] || { echo "0.5 0.4"; return 1; }

      r=$((16#''${hex:0:2}))
      g=$((16#''${hex:2:2}))
      b=$((16#''${hex:4:2}))

      local r_cor g_cor b_cor
      r_cor=$(echo "scale=4; $r / 255" | bc -l)
      g_cor=$(echo "scale=4; $g / 255" | bc -l)
      b_cor=$(echo "scale=4; $b / 255" | bc -l)

      r_cor=$(echo "scale=4; if ($r_cor > 0.04045) { e(2.4 * l($r_cor / 1.055 + 0.055)) } else { $r_cor / 12.92 }" | bc -l)
      g_cor=$(echo "scale=4; if ($g_cor > 0.04045) { e(2.4 * l($g_cor / 1.055 + 0.055)) } else { $g_cor / 12.92 }" | bc -l)
      b_cor=$(echo "scale=4; if ($b_cor > 0.04045) { e(2.4 * l($b_cor / 1.055 + 0.055)) } else { $b_cor / 12.92 }" | bc -l)

      local x y z
      x=$(echo "scale=4; ($r_cor * 0.649926 + $g_cor * 0.103455 + $b_cor * 0.197109)" | bc -l)
      y=$(echo "scale=4; ($r_cor * 0.234327 + $g_cor * 0.743075 + $b_cor * 0.022598)" | bc -l)
      z=$(echo "scale=4; ($r_cor * 0.000000 + $g_cor * 0.053077 + $b_cor * 1.035763)" | bc -l)

      local total
      total=$(echo "scale=4; $x + $y + $z" | bc -l)
      if [[ $(echo "$total == 0" | bc -l) -eq 1 ]]; then
        echo "0.5 0.4"
      else
        local x_y y_y
        x_y=$(echo "scale=4; $x / $total" | bc -l)
        y_y=$(echo "scale=4; $y / $total" | bc -l)
        echo "$x_y $y_y"
      fi
    }
  '';


in {
  config = {

  };}
