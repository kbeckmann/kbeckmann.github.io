title: Using QEMU instead of cross compiling for raspberry pi
date: 2017-05-26 02:13:37
tags:
  - raspi
  - raspberry pi
  - compiling
  - qemu
  - qemu-static
  - arm
---

I recently had to compile c++ code for the Raspberry pi and bumped into some issues because of the complexity of the code. There are at least four ways to build a binary:

1. Compile the code on a Raspberry pi using a native compiler (a compiler that runs on arm and produces arm binaries)
2. Cross-compile it on a powerful machine using a cross-compiled toolchain (runs on your normal x86_64 machine and produces arm binaries)
3. Run a native arm compiler thorugh QEMU on a powerful x86_64 machine - _this is what we're going to do_
4. Run a native arm compiler by emulating the whole Raspberry pi system including the kernel

Compiling on the Raspberry pi itself works well if the code is small and doesn't have a ton of heavy dependencies (e.g. boost). The problem one might run in to is that the resources of the poor Raspberry pi run out, i.e. the memory isn't enough and/or it simply takes too long time to compile since the cpu is weak.

Cross-compiling is the proper solution but it requires a bit of preparation and might take a lot of time to set up in case the toolchain has to be built (this is when a prebuilt toolchain is nice to have). You can read the [Hackaday writeup on how this goes here](https://hackaday.com/2016/02/03/code-craft-cross-compiling-for-the-raspberry-pi/).

Running the native arm compiler through QEMU maybe seems slow and weird but it could save some time. It did for me which is why I wrote this post.

The fourth method should also be possible but I haven't tried it and it seems complicated and even slower.

## Getting a build environment up and running

The following guide assumes you are running Archlinux with pacaur on an x86_64 machine and that you've got root. We will target the `ARMv6 Raspberry Pi`, i.e. `Raspberry pi`, `zero` and `zero w`. Use this guide with caution since we're going to be playing with mounts that might harm your system.

[Download the latest Archlinux distribution for the Raspberry pi](https://archlinuxarm.org/about/downloads).

Extract the archive and cd into it: (If you don't have `bsdtar`, install the `libarchive` package)
```plain
$ mkdir -p arch-pi
$ bsdtar -xpf ArchLinuxARM-rpi-latest.tar.gz -C arch-pi
$ cd arch-pi
```

If you see error messages like `./var/db/: Failed to set file flags` it means that your file system doesn't support the flags, but don't worry about that. This might happen in case you're running btrfs.


Install `qemu-user-static` and `binfmt-support` from AUR:
```plain
$ pacaur -S qemu-user-static binfmt-support
```

Now we will enable the magic of binfmt-support. What it does is that it will make use of a kernel feature to use an interpreter when execuring ARM binaries and run it through QEMU instead. [Read more here](http://binfmt-support.nongnu.org/).
```plain
$ sudo update-binfmts --enable
$ update-binfmts --display
```

The second command will show you which ELF headers it that will be intercepted. Ensure that you can see `qemu-arm (enabled)` in the list.

Copy `qemu-arm-static` to `./usr/bin/`:
```plain
$ sudo cp $(which qemu-arm-static) ./usr/bin/
```

In order to be able to run `pacman` and other tools, we have to trick the environment into thinking that it's running a full OS. We do this by mounting in some special paths. Note that this gives the emulated Archlinux environment control of your host machine. But since we're only building code, this should be fine.
```
# Mount the /proc file system
$ sudo mount -t proc proc proc

# Hack: Replace ./etc/mtab with a copy of your mounts
$ unlink ./etc/mtab
$ cat /proc/self/mounts > ./etc/mtab

# Hack: Hard code a nameserver in ./etc/resolv.conf since systemd isn't running
$ unlink ./etc/resolv.conf
$ echo "nameserver 8.8.8.8" > ./etc/resolv.conf

# Sometimes it's nice to have /dev/null. If needed, mount it in:
$ touch ./dev/null && sudo mount -o bind /dev/null ./dev/null
```

Chroot into the file system and start executing ARM binaries:
```plain
$ sudo chroot . ./bin/bash
[root@bacon ~]# uname -a
Linux bacon 4.10.13-1-ARCH #1 SMP PREEMPT Thu Apr 27 12:15:09 CEST 2017 armv7l GNU/Linux
```

Notice `armv7l`, it means we're running commands through QEMU.

Now it's time to install the tools you need to build your code. In my case I needed `base-devel` and `cmake`. `%` illustrates that we're in the chroot environment.
```plain
# Update, then install the packages
% pacman -Syyu
% pacman -S base-devel cmake
```

The environment should be ready to build your code now. Don't forget to use all of your cores when building.

## Problems

Some tools might expect /dev/fd/ to be set up properly. This can be solved with an epic hack.
```plain
# Run this inside the chroot
% ln -s /proc/self/fd /dev/fd
```

I had some problems accessing https resources, not sure why. If someone has a clue please let me know (I just get `curl: (35) SSL connect error` and similar errors.)
