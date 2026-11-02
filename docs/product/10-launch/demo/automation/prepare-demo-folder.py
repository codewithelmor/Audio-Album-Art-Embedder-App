"""Copies the supplied files into C:/demo/sample-music and strips any embedded art from the MP3 copy. Originals are never modified."""
import shutil, os
from mutagen.id3 import ID3
src = r'C:\Users\elmorc\Downloads'  # inputs supplied by the user (read-only)
dst = r'C:\demo\sample-music'
shutil.rmtree(dst, ignore_errors=True); os.makedirs(dst)
mp3 = os.path.join(dst, 'Mariah Carey - Bye Bye.mp3')
shutil.copy(os.path.join(src, 'Mariah Carey - Bye Bye.mp3'), mp3)
shutil.copy(os.path.join(src, 'ab67616d0000aa54633bb0a5f75b91c45c3a6b37.png'), os.path.join(dst, 'cover.png'))
t = ID3(mp3); t.delall('APIC'); t.save(mp3, v2_version=3)
assert not ID3(mp3).getall('APIC'), 'art still present'
print('prepared', os.listdir(dst))
