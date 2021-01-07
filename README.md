# Setup

To get new smartplugs working, just connect to their wifi network, set a manual ip address of 192.168.0.2 on the wifi adapter, and then run: 

`./tplink_smartplug.py -t 192.168.0.1 -j '{"netif":{"set_stainfo":{"ssid":"interwebs-n","password":"interwebs","key_type":3}}}'`


# Raspberry Pi Setup


## Stuff for the OS


sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev


## NVM so you can run different node versions

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash

## Yarn

curl -o- -L https://yarnpkg.com/install.sh | bash

export PATH="$PATH:/home/nstolmaker/.yarn/bin"

sudo setcap cap_net_raw+eip $(eval readlink -f $(which node))


## Give your user sudo (so you dont have to run as root (Optional)

- [Read this](https://www.raspberrypi.org/forums/viewtopic.php?t=169079)

## Get the code

- Git clone https://github.com/nstolmaker/hydroponode.git

# Notes

- 1st new smartplug is at: 192.168.0.41 "Pump"
- 2nd new smartplug is at: 192.168.0.42 "Heater"
- 3rd new smartplug is at: 192.168.0.43 "Grow light"
- 4th new smartplug is at: 192.168.0.44 "Outlet 4"

# Further Reading
[Noble](https://github.com/abandonware/noble)