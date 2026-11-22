#include "sternbild_tokens.h"

#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <fstream>
#include <string>
#include <string_view>

namespace st = sternbild::tokens;

static_assert(st::role::all.size() == 15);
static_assert(st::role::surface.r == 0x20 && st::role::surface.g == 0x1f && st::role::surface.b == 0x1c);
static_assert(st::role::surface.imu32 == 0xff1c1f20u);
static_assert(st::role::background_app.r == 0x18 && st::role::background_app.g == 0x17 && st::role::background_app.b == 0x15);
static_assert(st::role::accent.r == 0xb3 && st::role::accent.g == 0x8b && st::role::accent.b == 0x59);
static_assert(st::data::series.size() == 5);
static_assert(st::mark::all.size() == 9);
static_assert(st::space::s1 == 4.0f && st::space::s18 == 72.0f);
static_assert(st::app::command_bar == 28.0f);
static_assert(st::app::font_size::display == 16.0f);
static_assert(st::RADIUS == 0.0f && st::CUT == 6.0f);
static_assert(st::rule::width == 1.0f);
static_assert(st::motion::duration::fast_ms == 150u);
static_assert(st::motion::easing::standard.size() == 4);

static void check(bool ok, const char* msg) {
  if (!ok) {
    std::fprintf(stderr, "FAIL: %s\n", msg);
    std::exit(1);
  }
}

static bool starts_with_bytes(const std::filesystem::path& path, const char* magic, std::size_t len) {
  std::ifstream in(path, std::ios::binary);
  if (!in) return false;
  char buf[16]{};
  in.read(buf, static_cast<std::streamsize>(len));
  return static_cast<std::size_t>(in.gcount()) == len && std::memcmp(buf, magic, len) == 0;
}

int main() {
  check(std::string_view(st::VERSION) == SB_TEST_EXPECTED_VERSION, "C++ version matches");
  check(std::string_view(st::PREFIX) == "sb", "C++ prefix matches");
  check(std::string_view(st::role::surface.css_var) == "--sb-surface", "surface css_var");
  check(std::string_view(st::role::accent.hex) == "#b38b59", "accent hex");
  check(std::string_view(st::font::family::display[0]) == "Sternbild Display", "display font family");
  check(std::string_view(st::font::family::text[0]) == "IBM Plex Sans Condensed", "text font family");
  check(std::string_view(st::font::family::mono[0]) == "Source Code Pro", "mono font family");

  for (const st::Color& c : st::role::all) {
    uint32_t expected = (static_cast<uint32_t>(c.a) << 24) |
                        (static_cast<uint32_t>(c.b) << 16) |
                        (static_cast<uint32_t>(c.g) << 8) |
                        static_cast<uint32_t>(c.r);
    check(c.imu32 == expected, c.name);
  }

  const std::filesystem::path copied_fonts{SB_TEST_COPIED_FONTS_DIR};
  const std::filesystem::path copied_icons{SB_TEST_COPIED_ICONS_DIR};
  check(starts_with_bytes(copied_fonts / "IBMPlexSansCondensed-Regular.ttf", "\x00\x01\x00\x00", 4), "copied UI font");
  check(starts_with_bytes(copied_fonts / "SourceCodePro-Regular.ttf", "\x00\x01\x00\x00", 4), "copied mono font");
  check(starts_with_bytes(copied_fonts / "SternbildDisplay-Regular.otf", "OTTO", 4), "copied display OTF");
  check(starts_with_bytes(copied_fonts / "SternbildDisplay-Regular.woff2", "wOF2", 4), "copied display WOFF2");
  check(std::filesystem::is_regular_file(copied_fonts / "OFL-ibmplexsanscondensed.txt"), "copied UI OFL");
  check(std::filesystem::is_regular_file(copied_fonts / "OFL-sourcecodepro.txt"), "copied mono OFL");
  check(std::filesystem::is_regular_file(copied_icons / "sternbild-seal.svg"), "copied seal SVG");
  check(std::filesystem::is_regular_file(copied_icons / "caliper-icon-minerals-256.png"), "copied Caliper PNG");
  check(std::filesystem::is_regular_file(copied_icons / "astrolabe-icon-minerals-1024.png"), "copied Astrolabe PNG");

  std::printf("test_tokens_cpp passed (version %s)\n", st::VERSION);
  return 0;
}
