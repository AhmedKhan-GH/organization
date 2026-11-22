cmake_minimum_required(VERSION 3.20)
project(sternbild-tokens-c-tests LANGUAGES C CXX)

include(CTest)
include(FetchContent)

get_filename_component(_default_repo "${CMAKE_CURRENT_LIST_DIR}/../../.." ABSOLUTE)
set(STERNBILD_TOKENS_GIT_REPO "${_default_repo}" CACHE STRING "Git repository for sternbild-tokens")
set(STERNBILD_TOKENS_GIT_TAG "HEAD" CACHE STRING "Git ref or tag for sternbild-tokens")

FetchContent_Declare(
  sternbild-tokens
  GIT_REPOSITORY "${STERNBILD_TOKENS_GIT_REPO}"
  GIT_TAG "${STERNBILD_TOKENS_GIT_TAG}"
  SOURCE_SUBDIR packages/sternbild-tokens-c
)
FetchContent_MakeAvailable(sternbild-tokens)

get_target_property(_sb_version sternbild::tokens STERNBILD_TOKENS_VERSION)
get_target_property(_sb_font_ui sternbild::tokens STERNBILD_FONT_UI)
get_target_property(_sb_font_mono sternbild::tokens STERNBILD_FONT_MONO)
get_target_property(_sb_font_display_otf sternbild::tokens STERNBILD_FONT_DISPLAY_OTF)
get_target_property(_sb_font_display_woff2 sternbild::tokens STERNBILD_FONT_DISPLAY_WOFF2)
get_target_property(_sb_seal_svg sternbild::tokens STERNBILD_SEAL_SVG)
get_target_property(_sb_astrolabe_svg sternbild::tokens STERNBILD_ICON_ASTROLABE_SVG)
get_target_property(_sb_caliper_svg sternbild::tokens STERNBILD_ICON_CALIPER_SVG)
get_target_property(_sb_caliper_png_256 sternbild::tokens STERNBILD_ICON_CALIPER_PNG_256)
get_target_property(_sb_astrolabe_png_1024 sternbild::tokens STERNBILD_ICON_ASTROLABE_PNG_1024)
get_target_property(_sb_alidade_png_32 sternbild::tokens STERNBILD_ICON_ALIDADE_PNG_32)
get_target_property(_sb_atlas_png_512 sternbild::tokens STERNBILD_ICON_ATLAS_PNG_512)
get_target_property(_sb_compass_png_2048 sternbild::tokens STERNBILD_ICON_COMPASS_PNG_2048)

set(_sb_test_defs
  "SB_TEST_EXPECTED_VERSION=\"${_sb_version}\""
  "SB_TEST_FONT_UI=\"${_sb_font_ui}\""
  "SB_TEST_FONT_MONO=\"${_sb_font_mono}\""
  "SB_TEST_FONT_DISPLAY_OTF=\"${_sb_font_display_otf}\""
  "SB_TEST_FONT_DISPLAY_WOFF2=\"${_sb_font_display_woff2}\""
  "SB_TEST_SEAL_SVG=\"${_sb_seal_svg}\""
  "SB_TEST_ASTROLABE_SVG=\"${_sb_astrolabe_svg}\""
  "SB_TEST_CALIPER_SVG=\"${_sb_caliper_svg}\""
  "SB_TEST_CALIPER_PNG_256=\"${_sb_caliper_png_256}\""
  "SB_TEST_ASTROLABE_PNG_1024=\"${_sb_astrolabe_png_1024}\""
  "SB_TEST_ALIDADE_PNG_32=\"${_sb_alidade_png_32}\""
  "SB_TEST_ATLAS_PNG_512=\"${_sb_atlas_png_512}\""
  "SB_TEST_COMPASS_PNG_2048=\"${_sb_compass_png_2048}\""
)

add_executable(test_tokens_c test_tokens.c)
set_target_properties(test_tokens_c PROPERTIES C_STANDARD 11 C_STANDARD_REQUIRED ON C_EXTENSIONS OFF)
target_link_libraries(test_tokens_c PRIVATE sternbild::tokens)
target_compile_definitions(test_tokens_c PRIVATE ${_sb_test_defs})

add_executable(test_tokens_cpp test_tokens.cpp)
set_target_properties(test_tokens_cpp PROPERTIES CXX_STANDARD 20 CXX_STANDARD_REQUIRED ON CXX_EXTENSIONS OFF)
target_link_libraries(test_tokens_cpp PRIVATE sternbild::tokens)
target_compile_definitions(test_tokens_cpp PRIVATE
  ${_sb_test_defs}
  "SB_TEST_COPIED_FONTS_DIR=\"${CMAKE_CURRENT_BINARY_DIR}/copied_fonts\""
  "SB_TEST_COPIED_ICONS_DIR=\"${CMAKE_CURRENT_BINARY_DIR}/copied_icons\""
)

if(CMAKE_C_COMPILER_ID MATCHES "Clang|GNU")
  target_compile_options(test_tokens_c PRIVATE -Wall -Wextra -Werror)
endif()
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
  target_compile_options(test_tokens_cpp PRIVATE -Wall -Wextra -Werror)
endif()

sternbild_tokens_copy_assets(test_tokens_cpp
  FONTS_DIR "${CMAKE_CURRENT_BINARY_DIR}/copied_fonts"
  ICONS_DIR "${CMAKE_CURRENT_BINARY_DIR}/copied_icons"
)

add_test(NAME tokens_c11 COMMAND test_tokens_c)
add_test(NAME tokens_cpp20 COMMAND test_tokens_cpp)
