#include "sternbild_tokens.h"

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void check_cond(int cond, const char* msg) {
  if (!cond) {
    fprintf(stderr, "FAIL: %s\n", msg);
    exit(1);
  }
}

static uint32_t read_be32(const unsigned char* p) {
  return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) |
         ((uint32_t)p[2] << 8) | (uint32_t)p[3];
}

static void check_file_magic(const char* path, const unsigned char* magic, size_t len) {
  FILE* fp = fopen(path, "rb");
  check_cond(fp != NULL, path);
  unsigned char buf[16];
  size_t got = fread(buf, 1, len, fp);
  fclose(fp);
  check_cond(got == len, path);
  check_cond(memcmp(buf, magic, len) == 0, path);
}

static void check_svg(const char* path) {
  FILE* fp = fopen(path, "rb");
  check_cond(fp != NULL, path);
  char buf[512];
  size_t got = fread(buf, 1, sizeof(buf) - 1, fp);
  fclose(fp);
  check_cond(got > 0, path);
  buf[got] = '\0';
  check_cond(strstr(buf, "<svg") != NULL, path);
}

static void check_png(const char* path, uint32_t expected_size) {
  static const unsigned char sig[8] = {0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'};
  FILE* fp = fopen(path, "rb");
  check_cond(fp != NULL, path);
  unsigned char buf[24];
  size_t got = fread(buf, 1, sizeof(buf), fp);
  fclose(fp);
  check_cond(got == sizeof(buf), path);
  check_cond(memcmp(buf, sig, sizeof(sig)) == 0, path);
  check_cond(memcmp(buf + 12, "IHDR", 4) == 0, path);
  check_cond(read_be32(buf + 16) == expected_size, path);
  check_cond(read_be32(buf + 20) == expected_size, path);
}

static void check_color(const sb_color_t* c, const char* prefix) {
  check_cond(c->name != NULL && c->name[0] != '\0', "color name");
  check_cond(strncmp(c->css_var, prefix, strlen(prefix)) == 0, c->css_var);
  check_cond(strlen(c->hex) == 7 && c->hex[0] == '#', c->hex);
  unsigned int hr = 0, hg = 0, hb = 0;
  check_cond(sscanf(c->hex, "#%02x%02x%02x", &hr, &hg, &hb) == 3, c->hex);
  check_cond(c->r == hr && c->g == hg && c->b == hb, c->name);
  check_cond(c->a == 255u, c->name);
  uint32_t expected_imu32 =
      ((uint32_t)c->a << 24) | ((uint32_t)c->b << 16) |
      ((uint32_t)c->g << 8) | (uint32_t)c->r;
  check_cond(c->imu32 == expected_imu32, "imu32 packing");
  check_cond(c->imu32 == SB_IMU32(c->r, c->g, c->b, c->a), "SB_IMU32 macro");
}

int main(void) {
  check_cond(strcmp(STERNBILD_TOKENS_VERSION, SB_TEST_EXPECTED_VERSION) == 0, "version");
  check_cond(strcmp(STERNBILD_TOKENS_PREFIX, "sb") == 0, "prefix");

  check_cond(SB_ROLE_COUNT == 15u, "role count");
  for (size_t i = 0; i < SB_ROLE_COUNT; ++i) {
    check_color(&SB_ROLE_ALL[i], "--sb-");
  }
  check_cond(strcmp(SB_ROLE_BACKGROUND_APP.hex, "#181715") == 0, "background-app hex");
  check_cond(strcmp(SB_ROLE_ACCENT.hex, "#b38b59") == 0, "accent hex");
  check_cond(SB_ROLE_SURFACE.imu32 == 0xff1c1f20u, "surface imu32");

  check_cond(SB_DATA_COUNT == 5u, "data count");
  for (size_t i = 0; i < SB_DATA_COUNT; ++i) {
    check_color(&SB_DATA_SERIES[i], "--sb-data-");
    check_cond(SB_DATA_SERIES[i].imu32 == SB_DATA_ALL[i].imu32, "data series matches all");
  }

  check_cond(SB_MARK_COUNT == 9u, "mark count");
  for (size_t i = 0; i < SB_MARK_COUNT; ++i) {
    check_color(&SB_MARK_ALL[i], "--sb-mark-");
  }

  check_cond(SB_APP_COMMAND_BAR == 28.0f, "command bar");
  check_cond(SB_APP_FONT_SIZE_DISPLAY == 16.0f, "display font size");
  check_cond(SB_RADIUS == 0.0f, "radius");
  check_cond(SB_CUT == 6.0f, "cut");
  check_cond(SB_RULE_WIDTH == 1.0f, "rule width");
  check_cond(SB_MOTION_DURATION_FAST_MS == 150u, "fast ms");
  check_cond(SB_MOTION_DURATION_MOVE_MS == 300u, "move ms");

  static const unsigned char ttf_magic[4] = {0x00, 0x01, 0x00, 0x00};
  static const unsigned char otf_magic[4] = {'O', 'T', 'T', 'O'};
  static const unsigned char woff2_magic[4] = {'w', 'O', 'F', '2'};
  check_file_magic(SB_TEST_FONT_UI, ttf_magic, 4);
  check_file_magic(SB_TEST_FONT_MONO, ttf_magic, 4);
  check_file_magic(SB_TEST_FONT_DISPLAY_OTF, otf_magic, 4);
  check_file_magic(SB_TEST_FONT_DISPLAY_WOFF2, woff2_magic, 4);

  check_svg(SB_TEST_SEAL_SVG);
  check_svg(SB_TEST_ASTROLABE_SVG);
  check_svg(SB_TEST_CALIPER_SVG);

  check_png(SB_TEST_ALIDADE_PNG_32, 32u);
  check_png(SB_TEST_CALIPER_PNG_256, 256u);
  check_png(SB_TEST_ATLAS_PNG_512, 512u);
  check_png(SB_TEST_ASTROLABE_PNG_1024, 1024u);
  check_png(SB_TEST_COMPASS_PNG_2048, 2048u);

  printf("test_tokens_c passed (version %s)\n", STERNBILD_TOKENS_VERSION);
  return 0;
}
