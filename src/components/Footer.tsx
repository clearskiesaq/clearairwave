import React from 'react'
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
              <footer className="bg-gradient-to-t from-secondary to-secondary/50 dark:from-gray-900 dark:to-gray-800/50 py-12">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div>
                      <div className="flex items-center gap-2 text-primary transition-opacity hover:opacity-80"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <div className="w-5 h-5 rounded-full bg-primary animate-pulse-slow "></div>
                            </div>
                            <span className="font-medium text-lg tracking-tight leading-none">ClearSkies AQ</span>
                          </div>
                      <p className="text-muted-foreground text-sm">
                        Empowering communities with real-time air quality data to make informed decisions.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-4">QUICK LINKS</h3>
                      <ul className="space-y-2">
                        <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
                        <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
                        <li><Link to="/map" className="text-sm text-muted-foreground hover:text-primary transition-colors">Map</Link></li>
                        <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">About</a></li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-4">RESOURCES</h3>
                      <ul className="space-y-2">
                        <li><Link to="https://clearskiesaq.com/#guide" className="text-sm text-muted-foreground hover:text-primary transition-colors">  Guide</Link></li>
                        <li><Link to="https://clearskiesaq.com/#aqt" className="text-sm text-muted-foreground hover:text-primary transition-colors">Air Quality Tips</Link></li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-4">CONNECT</h3>
                      <ul className="space-y-2">
                        <li><a href="https://clearskiesaq.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">Real-time Alerts</a></li>
                        <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
                      </ul>
                    </div>
                  </div>
                  <div className="border-t border-border pt-8 text-center">
                    <p className="text-muted-foreground">
                      ClearSkies Community Air Quality Monitoring Platform
                    </p>
                    {/* <p className="text-xs text-muted-foreground mt-2">
                      Demo application with simulated data and real data • {new Date().getFullYear()}
                    </p> */}
                    <p className="text-xs text-muted-foreground mt-2">
                      Made by    
                      <a href="https://www.linkedin.com/in/aniket-chaudhari-12238833a/" className="text-blue-400 "> Aniket Chaudhari</a>, 
                      <a href="https://www.linkedin.com/in/gowrishrajagopal/" className="text-blue-400 "> Gowrish Rajagopal</a>, 
                      <a href="https://www.linkedin.com/in/yasharth-pandey/" className="text-blue-400 "> Yasharth Pandey</a>
                    </p>
                  </div>

                </div>
              </footer>
    )
};

export default Footer;