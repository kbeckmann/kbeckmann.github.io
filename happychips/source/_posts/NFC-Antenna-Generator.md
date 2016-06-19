title: NFC Antenna Generator
date: 2016-06-19 03:58:06
tags:
- nfc
- embedded
- antenna
- tool
---

I am currently designing a board with a PCB trace NFC-antenna and spent some time trying to figure out a good shape of the antenna.

ST has a nice tool in their [eDesignSuite](http://www.st.com/content/st_com/en/products/memories/nfc-rfid-memories-and-transceivers/dynamic-nfc-rfid-tags.html?querycriteria=productId=SC1412) to calculate the inductance based on the size and number of turns. But if you end up with a lot of turns it can be quite boring to draw the antenna yourself, so I made a tool for it. Could have done it in any language but ended up using javascript since it can be used directly in the browser.

Behold, the [NFC Antenna Generator](/nfc-antenna-generator/). It generates a footprint in any resolution that can easily be imported in KiCad or similar. Enjoy!

![Sample antenna](/nfc-antenna-generator/sample.png)