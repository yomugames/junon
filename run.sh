#!/bin/bash

# Colors for better UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display the menu
show_menu() {
    clear
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}    JUNON PROJECT RUNNER${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""
    echo -e "${YELLOW}Available Operations:${NC}"
    echo ""
    echo -e "${GREEN}1)${NC} Server (with nodemon & debug)"
    echo -e "${GREEN}2)${NC} Client"
    echo -e "${GREEN}3)${NC} Server Only (dev mode)"
    echo -e "${GREEN}4)${NC} Matchmaker"
    echo -e "${GREEN}5)${NC} Client Build"
    echo -e "${GREEN}6)${NC} Database Setup"
    echo ""
    echo -e "${RED}0)${NC} Exit"
    echo ""
    echo -e "${BLUE}Please select an option (0-6):${NC} "
}

# Function to run the selected operation
run_operation() {
    case $1 in
        1)
            echo -e "${GREEN}Starting Server with nodemon and debug...${NC}"
            npm run server
            ;;
        2)
            echo -e "${GREEN}Starting Client...${NC}"
            npm run client
            ;;
        3)
            echo -e "${GREEN}Starting Server Only (dev mode)...${NC}"
            npm run serveronly
            ;;
        4)
            echo -e "${GREEN}Starting Matchmaker...${NC}"
            npm run matchmaker
            ;;
        5)
            echo -e "${GREEN}Building Client...${NC}"
            npm run client:build
            ;;
        6)
            echo -e "${GREEN}Setting up Database...${NC}"
            npm run db:setup
            ;;
        0)
            echo -e "${YELLOW}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            sleep 2
            return 1
            ;;
    esac
}

# Main loop
while true; do
    show_menu
    read -r choice
    
    if run_operation "$choice"; then
        echo ""
        echo -e "${PURPLE}Operation completed. Press Enter to return to menu...${NC}"
        read -r
    fi
done