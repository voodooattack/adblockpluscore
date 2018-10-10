cmake_minimum_required(VERSION 3.12)

project(compression C)

# can be enabled if WASM is turned on, unfortunately, WASM is promise-based and would require
# an explicit async entry point.
# To make this work in the extension, require `ready` from
# `adblockpluscore/lib/compression` and change `lib/subscriptionInit.js:305`
# to call it first.
option(BUILD_WASM "Build a WebAssembly binary" OFF)

FILE(GLOB SRCS LZ4/*.c)
FILE(GLOB HDRS *.h LZ4/*.h)

set(CMAKE_EXECUTABLE_SUFFIX ".asm.js")
set(CMAKE_SHARED_LIBRARY_SUFFIX ".asm.js")
set(CMAKE_SHARED_LIBRARY_PREFIX "")

add_executable(compression ${SRCS} ${HDRS})

target_include_directories(compression PRIVATE "${PROJECT_SOURCE_DIR}")

set(EM_EXPORTS
  "-s EXTRA_EXPORTED_RUNTIME_METHODS='[\"cwrap\", \"setValue\", \"getValue\", \
  \"ccall\",\"lengthBytesUTF8\",\"stringToUTF8\",\"UTF8ToString\"]' \
  -s EXPORTED_FUNCTIONS='[\"_malloc\", \"_free\", \"_realloc\"]'"
)

set(EM_FLAGS "-s NO_DYNAMIC_EXECUTION=1 -Oz \
  -s ALLOW_MEMORY_GROWTH=0 -s NODEJS_CATCH_EXIT=0 -s NO_FILESYSTEM=1 \
  -s SIMD=0 -s SINGLE_FILE=1 -s MODULARIZE=0 -s ENVIRONMENT=node \
  -s NO_EXIT_RUNTIME=1 -s ASSERTIONS=1 ${EM_EXPORTS}"
)

add_definitions(
  -include emscripten.h
  -DLZ4LIB_VISIBILITY=EMSCRIPTEN_KEEPALIVE
  -DXXH_PUBLIC_API=EMSCRIPTEN_KEEPALIVE
)

install(TARGETS compression DESTINATION "${CMAKE_INSTALL_PREFIX}")

if(BUILD_WASM)
  message(STATUS "Building WebAssembly binary")
  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${EM_FLAGS}")
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_LD_FLAGS} ${EM_FLAGS} -s WASM=1")
  # Uncomment if you use `SINGLE_FILE=0` above!
  #install(FILES "${CMAKE_BINARY_DIR}/compression.wasm" DESTINATION "${CMAKE_INSTALL_PREFIX}")
else()
  message(STATUS "Building asm.js binary")
  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${EM_FLAGS}")
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_LD_FLAGS} ${EM_FLAGS} -s WASM=0")
  # Uncomment if you use `SINGLE_FILE=0` above!
  #install(FILES "${CMAKE_BINARY_DIR}/compression.asm.js.mem" DESTINATION "${CMAKE_INSTALL_PREFIX}")
endif()
