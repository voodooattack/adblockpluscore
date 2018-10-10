#!/usr/bin/python
# -*- coding: utf-8 -*-

import os
import subprocess
import errno
import re

def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError, exc:
        # Python >2.5
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise

ROOT = os.path.dirname(os.path.abspath(__file__))

mkdir_p(ROOT + '/asm-build')

os.chdir(ROOT + '/asm-build')

r = subprocess.call([
    'emcmake',
    'cmake',
    '-DCMAKE_INSTALL_PREFIX=' + ROOT + '/lib/compression/asm',
    '-DCMAKE_BUILD_TYPE=Release',
    '-DBUILD_WASM=OFF',
    '-G',
    'Unix Makefiles',
    ROOT + '/lib/compression',
    ])

if not r:
  r = subprocess.call(['emmake', 'make', 'all', 'install'])

if not r:
  # strip shebang if it exists (emcc bug?)
  lines = open(ROOT + '/lib/compression/asm/compression.asm.js').readlines()
  if (re.match('^#!(.*)', lines[0])):
    print 'Stripping sheban from output'
    open(ROOT + '/lib/compression/asm/compression.asm.js', 'w').writelines(lines[1:-1])
