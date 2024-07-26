let cardList = [];

async function loadCardList() {
    try {
        const response = await fetch('dk_card_list.json');
        cardList = await response.json();
    } catch (error) {
        console.error('Error loading card list:', error);
    }
}

async function uploadFile() {
    await loadCardList();

    const input = document.getElementById('fileInput');
    const file = input.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const parser = new DOMParser();
                const xml = parser.parseFromString(event.target.result, "application/xml");

                // Get all card elements within the <main>, <side>, and <extra> parts
                const mainElement = xml.getElementsByTagName('main')[0];
                const sideElement = xml.getElementsByTagName('side')[0];
                const extraElement = xml.getElementsByTagName('extra')[0];

                const mainCards = mainElement ? mainElement.getElementsByTagName('card') : [];
                const sideCards = sideElement ? sideElement.getElementsByTagName('card') : [];
                const extraCards = extraElement ? extraElement.getElementsByTagName('card') : [];

                // Get the table body elements
                const mainDeckTableBody = document.getElementById('mainDeckTable').querySelector('tbody');
                const sideDeckTableBody = document.getElementById('sideDeckTable').querySelector('tbody');
                const extraDeckTableBody = document.getElementById('extraDeckTable').querySelector('tbody');
                mainDeckTableBody.innerHTML = ''; // Clear the table
                sideDeckTableBody.innerHTML = ''; // Clear the table
                extraDeckTableBody.innerHTML = ''; // Clear the table

                let totalAtk = 0;
                let count = 0;
                let highAtkCount = 0;
                let highAtkSum = 0;
                let midAtkCount = 0;
                let midAtkSum = 0;
                let value5Count = 0;
                let totalValueSum = 0;
                let invalidCards = [];

                // Function to add cards to the table
                function addCardsToTable(cards, tableBody, isMainDeck = false) {
                    for (let i = 0; i < cards.length; i++) {
                        const cardName = cards[i].textContent.trim();
                        const tableRow = document.createElement('tr');
                        const nameCell = document.createElement('td');
                        const atkCell = document.createElement('td');
                        const valueCell = document.createElement('td');
                        const allowedCell = document.createElement('td');
                        nameCell.textContent = cardName;

                        // Find match in card list
                        const cardData = cardList.find(card => card.name === cardName);

                        if (cardData) {
                            const originalAtk = cardData.atk;
                            const level = cardData.level;

                            if (!isNaN(originalAtk)) {
                                // Adjust ATK based on level for calculation purposes (only for main deck)
                                let adjustedAtk = originalAtk;
                                if (isMainDeck) {
                                    if (level >= 5 && level <= 6) {
                                        adjustedAtk = Math.max(adjustedAtk - 600, 0);
                                    } else if (level >= 7) {
                                        adjustedAtk = Math.max(adjustedAtk - 1000, 0);
                                    }
                                    totalAtk += adjustedAtk;
                                    count++;

                                    if (level >= 1 && level <= 4) {
                                        if (originalAtk >= 1700) {
                                            highAtkCount++;
                                            highAtkSum += originalAtk;
                                        } else if (originalAtk >= 1500 && originalAtk <= 1650) {
                                            midAtkCount++;
                                            midAtkSum += originalAtk;
                                        }
                                    }
                                }

                                atkCell.textContent = originalAtk;
                            } else {
                                atkCell.textContent = '';
                            }

                            valueCell.textContent = cardData.value;
                            if (cardData.value === 5 && isMainDeck) {
                                value5Count++;
                            }
                            if (isMainDeck) {
                                totalValueSum += cardData.value;
                            }

                            allowedCell.appendChild(createIcon(true));
                        } else {
                            atkCell.textContent = '';
                            valueCell.textContent = '';
                            allowedCell.appendChild(createIcon(false));
                            invalidCards.push(cardName);
                        }

                        tableRow.appendChild(nameCell);
                        tableRow.appendChild(atkCell);
                        tableRow.appendChild(valueCell);
                        tableRow.appendChild(allowedCell);
                        tableBody.appendChild(tableRow);
                    }
                }

                // Add cards to respective tables
                addCardsToTable(mainCards, mainDeckTableBody, true);
                addCardsToTable(sideCards, sideDeckTableBody);
                addCardsToTable(extraCards, extraDeckTableBody);

                // Calculate average ATK
                const avgAtk = count > 0 ? Math.ceil(totalAtk / count) : 0;
                const maxAvgAtk = 1200;
                const avgAtkDifference = Math.abs(avgAtk - maxAvgAtk);

                // Function to create a check or cross icon
                function createIcon(isCheck) {
                    const icon = document.createElement('img');
                    icon.src = isCheck ? 'https://img.icons8.com/color/48/000000/checkmark.png' : 'https://img.icons8.com/color/48/000000/cancel.png';
                    icon.alt = isCheck ? 'Check' : 'Cross';
                    icon.width = 24;
                    icon.height = 24;
                    return icon;
                }

                // Check rule 1
                const rule1Value = document.getElementById('avgAtkValue');
                const rule1Tip = document.getElementById('avgAtkTip');
                const rule1Result = document.getElementById('avgAtkResult');
                rule1Value.textContent = `${avgAtk}`;
                if (avgAtk < maxAvgAtk) {
                    rule1Tip.textContent = `Deine Monster dürfen noch ${avgAtkDifference} ATK mehr haben!`;
                } else if (avgAtk > maxAvgAtk) {
                    rule1Tip.textContent = `Deine Monster müssen um ${avgAtkDifference} ATK weniger haben!`;
                } else {
                    rule1Tip.textContent = 'Perfekt!';
                }
                rule1Result.innerHTML = '';
                rule1Result.appendChild(createIcon(avgAtk <= maxAvgAtk));

                // Check rule 2
                const rule2Value = document.getElementById('highAtkCount');
                const rule2Sum = document.getElementById('highAtkSum');
                const rule2Tip = document.getElementById('highAtkTip');
                const rule2Result = document.getElementById('highAtkResult');
                rule2Value.textContent = `${highAtkCount}`;
                rule2Sum.textContent = `${highAtkSum}`;
                if (highAtkCount < 2) {
                    rule2Tip.textContent = `Du dürftest noch ${2 - highAtkCount} mehr spielen!`;
                } else if (highAtkCount > 2) {
                    rule2Tip.textContent = `Du müsstest ${highAtkCount - 2} weniger spielen!`;
                } else {
                    rule2Tip.textContent = '';
                }
                if (highAtkSum < 3650) {
                    rule2Tip.textContent += ` Sie dürften noch ${3650 - highAtkSum} ATK mehr haben!`;
                } else if (highAtkSum > 3650) {
                    rule2Tip.textContent += ` Sie müssten ${highAtkSum - 3650} ATK weniger haben!`;
                }
                if (highAtkCount === 2 && highAtkSum === 3650) {
                    rule2Tip.textContent = 'Perfekt!';
                }
                rule2Result.innerHTML = '';
                rule2Result.appendChild(createIcon(highAtkCount <= 2 && highAtkSum <= 3650));

                // Check rule 3
                const rule3Value = document.getElementById('midAtkCount');
                const rule3Sum = document.getElementById('midAtkSum');
                const rule3Tip = document.getElementById('midAtkTip');
                const rule3Result = document.getElementById('midAtkResult');
                rule3Value.textContent = `${midAtkCount}`;
                rule3Sum.textContent = `${midAtkSum}`;
                if (midAtkCount < 3) {
                    rule3Tip.textContent = `Du dürftest noch ${3 - midAtkCount} mehr spielen!`;
                } else if (midAtkCount > 3) {
                    rule3Tip.textContent = `Du müsstest ${midAtkCount - 3} weniger spielen!`;
                } else {
                    rule3Tip.textContent = '';
                }
                if (midAtkSum < 4700) {
                    rule3Tip.textContent += ` Sie dürften noch ${4700 - midAtkSum} ATK mehr haben!`;
                } else if (midAtkSum > 4700) {
                    rule3Tip.textContent += ` Sie müssten ${midAtkSum - 4700} ATK weniger haben!`;
                }
                if (midAtkCount === 3 && midAtkSum === 4700) {
                    rule3Tip.textContent = 'Perfekt!';
                }
                rule3Result.innerHTML = '';
                rule3Result.appendChild(createIcon(midAtkCount <= 3 && midAtkSum <= 4700));

                // Check rule 4
                const rule4Value = document.getElementById('allowedCardsValue');
                const rule4Tip = document.getElementById('allowedCardsTip');
                const rule4Result = document.getElementById('allowedCardsResult');
                rule4Value.textContent = invalidCards.length ? invalidCards.join(', ') : 'Alle Karten sind erlaubt';
                rule4Tip.textContent = invalidCards.length === 0 ? 'Perfekt!' : 'Einige Karten sind nicht erlaubt';
                rule4Result.innerHTML = '';
                rule4Result.appendChild(createIcon(invalidCards.length === 0));

                // Check rule 5
                const rule5Value = document.getElementById('value5Count');
                const rule5Tip = document.getElementById('value5Tip');
                const rule5Result = document.getElementById('value5Result');
                rule5Value.textContent = `${value5Count}`;
                if (value5Count < 3) {
                    rule5Tip.textContent = `Du dürftest noch ${3 - value5Count} mehr spielen!`;
                } else if (value5Count > 3) {
                    rule5Tip.textContent = `Du müsstest ${value5Count - 3} weniger spielen!`;
                } else {
                    rule5Tip.textContent = 'Perfekt!';
                }
                rule5Result.innerHTML = '';
                rule5Result.appendChild(createIcon(value5Count <= 3));

                // Check rule 6
                const rule6Value = document.getElementById('totalValueSum');
                const rule6Tip = document.getElementById('totalValueTip');
                const rule6Result = document.getElementById('totalValueResult');
                rule6Value.textContent = `${totalValueSum}`;
                if (totalValueSum < 90) {
                    rule6Tip.textContent = `Deine Karten dürften einen höheren value von ${90 - totalValueSum} haben!`;
                } else if (totalValueSum > 90) {
                    rule6Tip.textContent = `Deine Karten müssen einen niedrigeren value von ${totalValueSum - 90} haben!`;
                } else {
                    rule6Tip.textContent = 'Perfekt!';
                }
                rule6Result.innerHTML = '';
                rule6Result.appendChild(createIcon(totalValueSum <= 90));

                // Make the tables visible
                document.getElementById('cardList').classList.remove('hidden');
                document.getElementById('ruleCheck').classList.remove('hidden');
            } catch (error) {
                console.error('Error parsing XML:', error);
            }
        };
        reader.readAsText(file);
    } else {
        console.error('No file selected');
    }
}
