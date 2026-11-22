cmake_minimum_required(VERSION 3.20)
project(sternbild-tokens VERSION 1.1.0 LANGUAGES NONE)

if(NOT TARGET sternbild::tokens)
  add_library(sternbild_tokens INTERFACE)
  add_library(sternbild::tokens ALIAS sternbild_tokens)

  target_include_directories(sternbild_tokens INTERFACE
    "${CMAKE_CURRENT_LIST_DIR}/include"
  )

  get_filename_component(_sb_brand_dir
    "${CMAKE_CURRENT_LIST_DIR}/../sternbild-docs/sternbild_docs/assets/brand"
    ABSOLUTE
  )
  get_filename_component(_sb_fonts_dir "${_sb_brand_dir}/fonts" ABSOLUTE)
  get_filename_component(_sb_public_assets_dir
    "${CMAKE_CURRENT_LIST_DIR}/../../public/assets"
    ABSOLUTE
  )

  set(_sb_font_ui "${_sb_fonts_dir}/IBMPlexSansCondensed-Regular.ttf")
  set(_sb_font_ui_license "${_sb_fonts_dir}/OFL-ibmplexsanscondensed.txt")
  set(_sb_font_mono "${_sb_fonts_dir}/SourceCodePro-Regular.ttf")
  set(_sb_font_mono_license "${_sb_fonts_dir}/OFL-sourcecodepro.txt")
  set(_sb_font_display_otf "${_sb_fonts_dir}/SternbildDisplay-Regular.otf")
  set(_sb_font_display_woff2 "${_sb_fonts_dir}/SternbildDisplay-Regular.woff2")
  set(_sb_font_files
    "${_sb_font_ui}"
    "${_sb_font_ui_license}"
    "${_sb_font_mono}"
    "${_sb_font_mono_license}"
    "${_sb_font_display_otf}"
    "${_sb_font_display_woff2}"
  )

  foreach(_sb_file IN LISTS _sb_font_files)
    if(NOT EXISTS "${_sb_file}")
      message(FATAL_ERROR "sternbild-tokens: missing canonical font asset: ${_sb_file}")
    endif()
  endforeach()

  set(_sb_seal_svg "${_sb_brand_dir}/sternbild-seal.svg")
  if(NOT EXISTS "${_sb_seal_svg}")
    message(FATAL_ERROR "sternbild-tokens: missing canonical seal SVG: ${_sb_seal_svg}")
  endif()

  set(_sb_apps alidade astrolabe atlas caliper compass)
  set(_sb_png_sizes 32 180 256 512 1024 2048)
  set(_sb_icon_svgs "")
  set(_sb_icon_pngs "")

  set_target_properties(sternbild_tokens PROPERTIES
    STERNBILD_TOKENS_VERSION "${PROJECT_VERSION}"
    STERNBILD_FONTS_DIR "${_sb_fonts_dir}"
    STERNBILD_FONT_UI "${_sb_font_ui}"
    STERNBILD_FONT_UI_LICENSE "${_sb_font_ui_license}"
    STERNBILD_FONT_MONO "${_sb_font_mono}"
    STERNBILD_FONT_MONO_LICENSE "${_sb_font_mono_license}"
    STERNBILD_FONT_DISPLAY_OTF "${_sb_font_display_otf}"
    STERNBILD_FONT_DISPLAY_WOFF2 "${_sb_font_display_woff2}"
    STERNBILD_FONT_FILES "${_sb_font_files}"
    STERNBILD_BRAND_SVGS_DIR "${_sb_brand_dir}"
    STERNBILD_SEAL_SVG "${_sb_seal_svg}"
    STERNBILD_ICON_PNGS_DIR "${_sb_public_assets_dir}"
  )

  foreach(_sb_app IN LISTS _sb_apps)
    string(TOUPPER "${_sb_app}" _sb_app_upper)
    set(_sb_app_svg "${_sb_brand_dir}/${_sb_app}-icon-minerals.svg")
    if(NOT EXISTS "${_sb_app_svg}")
      message(FATAL_ERROR "sternbild-tokens: missing canonical icon SVG: ${_sb_app_svg}")
    endif()
    list(APPEND _sb_icon_svgs "${_sb_app_svg}")
    set_target_properties(sternbild_tokens PROPERTIES
      "STERNBILD_ICON_${_sb_app_upper}_SVG" "${_sb_app_svg}"
    )

    foreach(_sb_size IN LISTS _sb_png_sizes)
      set(_sb_app_png "${_sb_public_assets_dir}/${_sb_app}-icon-minerals-${_sb_size}.png")
      if(NOT EXISTS "${_sb_app_png}")
        message(FATAL_ERROR "sternbild-tokens: missing canonical icon PNG: ${_sb_app_png}")
      endif()
      list(APPEND _sb_icon_pngs "${_sb_app_png}")
      set_target_properties(sternbild_tokens PROPERTIES
        "STERNBILD_ICON_${_sb_app_upper}_PNG_${_sb_size}" "${_sb_app_png}"
      )
    endforeach()
  endforeach()

  set_target_properties(sternbild_tokens PROPERTIES
    STERNBILD_ICON_SVGS "${_sb_icon_svgs}"
    STERNBILD_ICON_PNGS "${_sb_icon_pngs}"
  )

  unset(_sb_brand_dir)
  unset(_sb_fonts_dir)
  unset(_sb_public_assets_dir)
  unset(_sb_font_ui)
  unset(_sb_font_ui_license)
  unset(_sb_font_mono)
  unset(_sb_font_mono_license)
  unset(_sb_font_display_otf)
  unset(_sb_font_display_woff2)
  unset(_sb_font_files)
  unset(_sb_seal_svg)
  unset(_sb_apps)
  unset(_sb_png_sizes)
  unset(_sb_icon_svgs)
  unset(_sb_icon_pngs)
endif()

function(sternbild_tokens_copy_assets target)
  cmake_parse_arguments(ARG "" "FONTS_DIR;ICONS_DIR" "" ${ARGN})
  if(NOT TARGET "${target}")
    message(FATAL_ERROR "sternbild_tokens_copy_assets: target '${target}' does not exist")
  endif()

  if(ARG_FONTS_DIR)
    get_target_property(_fonts sternbild::tokens STERNBILD_FONT_FILES)
    add_custom_command(TARGET "${target}" POST_BUILD
      COMMAND "${CMAKE_COMMAND}" -E make_directory "${ARG_FONTS_DIR}"
      COMMAND "${CMAKE_COMMAND}" -E copy_if_different ${_fonts} "${ARG_FONTS_DIR}"
      COMMENT "Copying Sternbild fonts for ${target}"
    )
  endif()

  if(ARG_ICONS_DIR)
    get_target_property(_seal sternbild::tokens STERNBILD_SEAL_SVG)
    get_target_property(_svgs sternbild::tokens STERNBILD_ICON_SVGS)
    get_target_property(_pngs sternbild::tokens STERNBILD_ICON_PNGS)
    add_custom_command(TARGET "${target}" POST_BUILD
      COMMAND "${CMAKE_COMMAND}" -E make_directory "${ARG_ICONS_DIR}"
      COMMAND "${CMAKE_COMMAND}" -E copy_if_different "${_seal}" ${_svgs} ${_pngs} "${ARG_ICONS_DIR}"
      COMMENT "Copying Sternbild icons for ${target}"
    )
  endif()
endfunction()
