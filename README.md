# digital-tabletops
The repo contains source code for the Digital TableTops touch client and accompanying Foundry VTT module.

The touch client allows you to use a compatible infrared (IR) touch frame device in Arkenforge or Foundry **on the same computer as the GM view**.
Until now, you had to use a separate computer just for touch input. But not anymore! Now you can use a single computer for everything.

It sends special packets to the touch device using HID that causes it to enter into a direct communication mode.
While in this mode, no touch data is sent to the OS as regular input. So the mouse cursor will not move to the location of the touch.
Instead, the raw touch data is parsed by the Digital TableTops client and sent directly to your VTT of choice.

This functionality is built in to my own free VTT, the Digital TableeTops VTT found on Steam here: [store.steampowered.com/app/3073720/Digital_TableTops_VTT/](https://store.steampowered.com/app/3073720/Digital_TableTops_VTT/)
Therefore, you should **NOT** be using this extra software if using my own VTT. It is not necessary.
My VTT is 100% free, no strings attached. Very easy to use and lightweight.
But I understand some people need the extra features found in a commercial VTT like Arkenforge or Foundry.

I've tested it with various IR frame models from: 

- Greentouch
- SpecialTouch
- TouchSmith
- TouchWo
- YCLTouch

Please keep in mind that I cannot guarantee **ANY** IR touch device is compatible other than the ones I sell on my website, [digitaltabletops.com](https://digitaltabletops.com/)

My software will tell you instantly whether your IR touch frame is compatible. It will also detect if it *might* be compatible. If this is the case, you will need to run a separate configuration utility from one of the touch manufacturers. I recommend this one from [Greentouch](https://www.greentouch.com.cn/download/). If it shows up fine in that program, all I'd need is your PID and VID (which will be clearly shown in that program). You can send it to mark@digitaltabletops.com

## Installation
No installation is required for the Digital TableTops touch client. Simply download the executable for your operating system from the latest release [here](https://github.com/DigitalTableTops/digital-tabletops/releases/latest/)

To install the Foundry module, follow the usual steps:

1. Open the Foundry VTT Setup screen.
2. Go to the **Add-on Modules** tab.
3. Click the **Install Module** button.
4. Paste the following URL into the **Manifest URL** field at the bottom:
   `https://github.com/DigitalTableTops/digital-tabletops/blob/main/module.json`
5. Click **Install**.


## Configuration
For the touch client in Arkenforge:
It should show up automatically in the list of available touch devices in the appropriate menu. Simply click pair and it should pair automatically.

For the touch client in Foundry:
Create a user account called "TV" and log into it on a separate browser from the GM view. This "TV" user should be shown on the TV (of course).
You can edit the port, but it is not recommended unless a conflict is present.
You should measure the physical size of your TV and enter it in the startup screen when Foundry first loads. This is required if using the "zoom to scale" button.

## License
Digital TableTops is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Terms of Use
- **Personal & non-commercial use** is free and permitted
- **Commercial use** is prohibited without a separate commercial license
