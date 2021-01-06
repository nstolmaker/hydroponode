# Setup
To get new smartplugs working, just connect to their wifi network, set a manual ip address of 192.168.0.2 on the wifi adapter, and then run: 
`./tplink_smartplug.py -t 192.168.0.1 -j '{"netif":{"set_stainfo":{"ssid":"interwebs-n","password":"interwebs","key_type":3}}}'`


# Notes
- 1st new smartplug is at: 192.168.0.41 "Pump"
- 2nd new smartplug is at: 192.168.0.42 "Heater"
- 3rd new smartplug is at: 192.168.0.43 "Lights"