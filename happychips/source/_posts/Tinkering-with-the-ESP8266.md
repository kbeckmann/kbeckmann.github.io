title: Tinkering with the ESP8266
date: 2015-06-28 23:09:26
tags:
- esp8266
- raspberry pi
categories:
- hardware
---
# Tinkering with the ESP8266
A [friend](http://memset.io/) of mine showed me the ESP8266 and I just had to play with it. It's sold as a serial-to-wifi module to Arduino but the firmware can be changed to do more. It's also really cheap, about $2.20 from Aliexpress.

We flashed [NodeMCU](https://github.com/nodemcu/nodemcu-firmware.git) onto it and wrote some Lua code to connect to a wifi-AP and access a webpage. And it worked, most of the times at least. The stability and reliability isn't really 100% currently, but hopefully it will be improved over time.

# Connecting it
I haven't got all the tools and power supplies yet so we had to do dirty hacks to get it to work. In order to use the chip, 3.3V and ground need to be connected to two pins each. A proper power supply and a bredboard would've done things easier but there's always a way if you don't have it.

We found a dusty Raspberry Pi B and just used its 3.3 volt and ground pins. Good for us that there are multiple connectors.

In order to use the chip, the following pins need to be connected:

        +3.3V  => VCC
        +3.3V  => CH_PD
        GND    => GND
        GND    => GPIO0 When flashing the firmware

A USB-to-serial is also needed. Make sure that it uses 3.3V. I used a PL2303HX, it's pretty cheap. Connect it:

        GND => GND
        RX  => TX
        TX  => RX
        +5V => don't connect this :)

# Code to access the web
After flashing NodeMCU, it's time for some Lua scripting. It's possible to just connect to the serial interface and just write code, but it gets really frustrating when your code grows, obviously. 

There's an IDE called [esplorer](https://github.com/4refr0nt/ESPlorer) that helps you out. It's pretty basic and written in java, but it gets the job done. There's also an [AUR package](https://aur.archlinux.org/packages/esplorer/) for it so you can install it quickly if you run Arch.

{% codeblock lang:lua %}
-- Connect to a wifi-ap
wifi.setmode(wifi.STATION)
wifi.sta.config("your-ssid", "password")

-- Set a timer with 500ms delay and check if we've got an IP-address
tmr.alarm(0, 500, 1, function()
    if wifi.sta.getip() == nil then
        print("No ip yet")
    else
        print("Got ip: " .. wifi.sta.getip())
        tmr.stop(0)
        reg_gpio()
    end
end)

-- Register an interrupt on GPIO pin 3 (it's called GPIO0 on the board)
-- "both" is used because it seems to work better than simply "up". 
-- This means that the callback is called whenever the pin goes high or low.
-- Not sure if it's because of a bug in the firmware or I just had bad luck
-- when testing.
function reg_gpio()
gpio.mode(3, gpio.INT)
gpio.trig(3, "both", function(level)
        print("both: 3  " .. level)
        if level == 1 then
            http_get("192.168.0.1", 80, "192.168.0.1", "/")
        end
    end)
end

-- A simple HTTP GET call. Not optimal but works.
function http_get(host_addr, port, hostname, path)
    print("http_get()")
    sk=net.createConnection(net.TCP, 0)
    sk:on("receive", function(sck, c) print(c) end )
    sk:connect(port, host_addr)
    request = "GET " .. path .. " HTTP/1.1\r\n" ..
    "Host: " .. hostname .. "\r\n" ..
    "Connection: close\r\nAccept: */*\r\n\r\n"
    print(request)
    sk:send(request)
end
{% endcodeblock %}

My code works most of the time but not always. It's probably because the firmware is still a bit buggy, but hopefully it will improve.

# Pinout reference
Here are the pinout configurations for reference.

ESP8266

![Pinout configuration of ESP8266](/images/Tinkering-with-the-ESP8266_wifi.jpg)

Raspberry PI B+. A and B only have 26 pins, they are the same. <small><small>[Source](http://www.element14.com/community/community/raspberry-pi/raspberry-pi-bplus/blog/2014/12/05/minecraft-on-the-raspberry-pi-model-a)

![Pinout configuration of ESP8266](/images/Tinkering-with-the-ESP8266_raspi.png)
