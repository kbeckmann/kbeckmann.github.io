title: Headless raspberry pi (for reals)
date: 2017-05-06 22:17:17
tags:
  - raspi
  - raspberry pi
  - headless
  - USB
  - UART
  - USB gadget
---

If you want to install and interact with a raspberry pi using only a USB cable and nothing else (no UART hardware, no physical keybord, hdmi-screen, wifi, network cable etc), this guide is for you. We will set up wifi and enable ssh while we're at it just because we can.

We are going to:
- Download and install the latest raspbian-jessie-lite on an SD-card
- Configure the pi to act as a USB serial device
- Configure wpa_supplicant with your wifi AP's credentials
- Create symlinks to enable systemd services on boot (wpa_supplicant, ttyGS0 and ssh)

This guide has only been tested on a **Raspberry Pi Zero W**, but should work fine on other Pis.

Download and transfer raspbian-jessie-light to an sdcard (assuming /dev/mmcblk0 here)
```
$ wget https://downloads.raspberrypi.org/raspbian_lite_latest
$ unzip raspbian_lite_latest
$ sudo dd if=2017-04-10-raspbian-jessie-lite.img of=/dev/mmcblk0 status=progress bs=1M
$ sync
```

Mount the boot partition
```
$ mkdir boot
$ sudo mount /dev/mmcblk0p1 boot
```

Add the following line in the end of `boot/config.txt` to enable the DWC2 USB driver (this enables USB gadgets):
```
dtoverlay=dwc2
```

Add `modules-load=dwc2,g_serial` after `rootwait` in `boot/cmdline.txt`
```
# Your cmdline.txt should look something like this (but might differ and that's fine)
dwc_otg.lpm_enable=0 console=serial0,115200 console=tty1 root=/dev/mmcblk0p2 rootfstype=ext4 elevator=deadline fsck.repair=yes rootwait modules-load=dwc2,g_serial quiet init=/usr/lib/raspi-config/init_resize.sh
```

Let's configure the root filesystem.
```
# Mount the root partition
$ mkdir root
$ sudo mount /dev/mmcblk0p2 root
$ cd root

# Configure your wifi credentials by editing /etc/wpa_supplicant/wpa_supplicant.conf
$ sudo vim etc/wpa_supplicant/wpa_supplicant.conf

ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
network={
    ssid="Your SSID"
    psk="Password"
}

# Save and exit


# Fake systemctl enable wpa_supplicant.service
$ cd ./etc/systemd/system/multi-user.target.wants
$ sudo ln -s ../../../../lib/systemd/system/wpa_supplicant.service

# Fake systemctl enable ssh.service
$ sudo ln -s ../../../../lib/systemd/system/ssh.service

# Fake systemctl enable getty@ttyGS0.service
$ cd ../getty.target.wants
$ sudo ln -s /lib/systemd/system/getty@.service getty@ttyGS0.service

# Done! Sync and unmount
$ cd ../../../../..; sync; sudo umount boot root
```

Remove the sd-card and insert it in your Pi, connect a USB cable in the "USB Data port", then connect it to your computer. Run `journalctl -f` on your host machine to see what happens then the Pi boots. After a while, you will probably end up seeing
```
May 06 21:04:54 bacon kernel: cdc_acm 1-2:2.0: ttyACM0: USB ACM device
```

Go ahead now and connect to the device using `screen /dev/ttyACM0 115200` and interact with your raspi. In case you've never used `screen` before: exit using `<Ctrl>-a d`.

```
pi@raspberrypi:~$ uname -a
Linux raspberrypi 4.4.50+ #970 Mon Feb 20 19:12:50 GMT 2017 armv6l GNU/Linux
```

### Alternative solution using qemu-arm-static (not recommended)

While writing this guide I used `qemu-arm-static` in order to enable the systemd services. This turned out to be really messy (segfault in strange places etc). If you want to try this approach, feel free to change the symlink steps above to the following:

```
# Install qemu-user-static. On archlinux with AUR:
$ pacaur -S qemu-user-static
# Ubuntu:
$ sudo apt-get install qemu-user-static

# Copy qemu-arm-static to the root filesystem
$ sudo cp $(which qemu-arm-static) ./usr/bin/

# Enter the pi's root filesystem by running the local bash(dash) using `qemu-arm-static`
$ sudo chroot . ./usr/bin/qemu-arm-static /bin/bash

# We are now in the mounted root filesystem.
# Enable wpa_supplicant so that it runs on boot
% qemu-arm-static /bin/systemctl enable wpa_supplicant.service

# Enable the USB TTY service
% qemu-arm-static /bin/systemctl enable getty@ttyGS0.service

# Enable SSH (this might result in a segfault...)
% qemu-arm-static /bin/systemctl enable ssh.service
```


### More reading
[Adafruit's article on how to enable the USB gadgets](https://learn.adafruit.com/turning-your-raspberry-pi-zero-into-a-usb-gadget?view=all)
[CONFIG_USB_DWC2: DesignWare USB2 DRD Core Support](https://cateee.net/lkddb/web-lkddb/USB_DWC2.html)
[Linux-USB Gadget API Framework](http://www.linux-usb.org/gadget/)