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
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.split('.').pop();
        const reader = new FileReader();

        reader.onload = async function(event) {
            try {
                let mainCards = [], sideCards = [], extraCards = [];

                if (fileExtension === 'xml') {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(event.target.result, "application/xml");

                    const mainElement = xml.getElementsByTagName('main')[0];
                    const sideElement = xml.getElementsByTagName('side')[0];
                    const extraElement = xml.getElementsByTagName('extra')[0];

                    mainCards = mainElement ? Array.from(mainElement.getElementsByTagName('card')).map(card => card.textContent.trim()) : [];
                    sideCards = sideElement ? Array.from(sideElement.getElementsByTagName('card')).map(card => card.textContent.trim()) : [];
                    extraCards = extraElement ? Array.from(extraElement.getElementsByTagName('card')).map(card => card.textContent.trim()) : [];
                } else if (fileExtension === 'ydk') {
                    const ydkContent = event.target.result;
                    const lines = ydkContent.split('\n');
                    let deckType = 'main';

                    lines.forEach(line => {
                        if (line.startsWith('#main')) {
                            deckType = 'main';
                        } else if (line.startsWith('#extra')) {
                            deckType = 'extra';
                        } else if (line.startsWith('!side')) {
                            deckType = 'side';
                        } else if (line.trim() && !line.startsWith('#')) {
                            const cardId = line.trim();
                            if (deckType === 'main') {
                                mainCards.push(cardId);
                            } else if (deckType === 'extra') {
                                extraCards.push(cardId);
                            } else if (deckType === 'side') {
                                sideCards.push(cardId);
                            }
                        }
                    });
                }

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
                    cards.forEach(cardIdOrName => {
                        const tableRow = document.createElement('tr');
                        const nameCell = document.createElement('td');
                        const atkCell = document.createElement('td');
                        const valueCell = document.createElement('td');
                        const allowedCell = document.createElement('td');

                        // Find match in card list
                        const cardData = fileExtension === 'xml' ? cardList.find(card => card.name === cardIdOrName) : cardList.find(card => card.id === parseInt(cardIdOrName));

                        if (cardData) {
                            const originalAtk = cardData.atk;
                            const level = cardData.level;

                            nameCell.textContent = cardData.name;

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
                            nameCell.textContent = fileExtension === 'xml' ? cardIdOrName : `Unknown ID: ${cardIdOrName}`;
                            atkCell.textContent = '';
                            valueCell.textContent = '';
                            allowedCell.appendChild(createIcon(false));
                            invalidCards.push(fileExtension === 'xml' ? cardIdOrName : `Unknown ID: ${cardIdOrName}`);
                        }

                        tableRow.appendChild(nameCell);
                        tableRow.appendChild(atkCell);
                        tableRow.appendChild(valueCell);
                        tableRow.appendChild(allowedCell);
                        tableBody.appendChild(tableRow);
                    });
                }

                // Add cards to respective tables
                addCardsToTable(mainCards, mainDeckTableBody, true);
                addCardsToTable(sideCards, sideDeckTableBody);
                addCardsToTable(extraCards, extraDeckTableBody);

                // Calculate average ATK
                const avgAtk = count > 0 ? Math.ceil(totalAtk / count) : 0;
                const maxAvgAtk = 1200;
                const avgAtkDifference = Math.abs(maxAvgAtk * count - totalAtk);

                // Function to create a check or cross icon
                function createIcon(isCheck) {
                    const icon = document.createElement('img');
                    icon.src = isCheck ? 'https://img.icons8.com/color/48/000000/checkmark.png' : 'https://img.icons8.com/color/48/000000/cancel.png';
                    icon.alt = isCheck ? 'Check' : 'Cross';
                    icon.width = 24;
                    icon.height = 24;
                    return icon;
                }

                // Check rule 1: Allowed Cards
                const rule1Value = document.getElementById('allowedCardsValue');
                const rule1Tip = document.getElementById('allowedCardsTip');
                const rule1Result = document.getElementById('allowedCardsResult');
                rule1Value.textContent = invalidCards.length ? invalidCards.join(', ') : 'Alle Karten sind erlaubt';
                rule1Tip.textContent = invalidCards.length === 0 ? 'Perfekt!' : 'Einige Karten sind nicht erlaubt';
                rule1Result.innerHTML = '';
                rule1Result.appendChild(createIcon(invalidCards.length === 0));

                // Check rule 2: Main Deck Card Count
                const mainDeckCount = mainCards.length;
                const rule2Value = document.getElementById('mainDeckCount');
                const rule2Tip = document.getElementById('mainDeckTip');
                const rule2Result = document.getElementById('mainDeckResult');
                rule2Value.textContent = `${mainDeckCount}`;
                if (mainDeckCount < 45) {
                    rule2Tip.textContent = `Dein Main Deck braucht noch ${45 - mainDeckCount} Karten mehr!`;
                } else if (mainDeckCount > 45) {
                    rule2Tip.textContent = `Dein Main Deck hat ${mainDeckCount - 45} Karten zu viel!`;
                } else {
                    rule2Tip.textContent = 'Perfekt!';
                }
                rule2Result.innerHTML = '';
                rule2Result.appendChild(createIcon(mainDeckCount === 45));

                // Check rule 3: Sum of Values
                const rule3Value = document.getElementById('totalValueSum');
                const rule3Tip = document.getElementById('totalValueTip');
                const rule3Result = document.getElementById('totalValueResult');
                rule3Value.textContent = `${totalValueSum} (Ø${(totalValueSum/mainDeckCount).toFixed(2)})`;
                if (totalValueSum < 90) {
                    rule3Tip.textContent = `Deine Karten dürften einen höheren value von ${90 - totalValueSum} haben!`;
                } else if (totalValueSum > 90) {
                    rule3Tip.textContent = `Deine Karten müssen einen niedrigeren value von ${totalValueSum - 90} haben!`;
                } else {
                    rule3Tip.textContent = 'Perfekt!';
                }
                rule3Result.innerHTML = '';
                rule3Result.appendChild(createIcon(totalValueSum <= 90));

                // Check rule 4: Value 5
                const rule4Value = document.getElementById('value5Count');
                const rule4Tip = document.getElementById('value5Tip');
                const rule4Result = document.getElementById('value5Result');
                rule4Value.textContent = `${value5Count}`;
                if (value5Count < 3) {
                    rule4Tip.textContent = `Du dürftest noch ${3 - value5Count} mehr spielen!`;
                } else if (value5Count > 3) {
                    rule4Tip.textContent = `Du müsstest ${value5Count - 3} weniger spielen!`;
                } else {
                    rule4Tip.textContent = 'Perfekt!';
                }
                rule4Result.innerHTML = '';
                rule4Result.appendChild(createIcon(value5Count <= 3));

                // Check rule 5: Average ATK
                const rule5Value = document.getElementById('avgAtkValue');
                const rule5Tip = document.getElementById('avgAtkTip');
                const rule5Result = document.getElementById('avgAtkResult');
                rule5Value.textContent = `${avgAtk}`;
                if (avgAtk < maxAvgAtk) {
                    rule5Tip.textContent = `Deine Monster dürfen noch ${avgAtkDifference} ATK mehr haben!`;
                } else if (avgAtk > maxAvgAtk) {
                    rule5Tip.textContent = `Deine Monster müssen um ${avgAtkDifference} ATK weniger haben!`;
                } else {
                    rule5Tip.textContent = 'Perfekt!';
                }
                rule5Result.innerHTML = '';
                rule5Result.appendChild(createIcon(avgAtk <= maxAvgAtk));

                // Check rule 6: 1700+ Monsters
                const rule6Value = document.getElementById('highAtkCount');
                const rule6Sum = document.getElementById('highAtkSum');
                const rule6Tip = document.getElementById('highAtkTip');
                const rule6Result = document.getElementById('highAtkResult');
                rule6Value.textContent = `${highAtkCount}`;
                rule6Sum.textContent = `${highAtkSum}`;
                if (highAtkCount < 2) {
                    rule6Tip.textContent = `Du dürftest noch ${2 - highAtkCount} mehr spielen!`;
                } else if (highAtkCount > 2) {
                    rule6Tip.textContent = `Du müsstest ${highAtkCount - 2} weniger spielen!`;
                } else {
                    rule6Tip.textContent = '';
                }
                if (highAtkSum < 3650) {
                    rule6Tip.textContent += ` Sie dürften noch ${3650 - highAtkSum} ATK mehr haben!`;
                } else if (highAtkSum > 3650) {
                    rule6Tip.textContent += ` Sie müssten ${highAtkSum - 3650} ATK weniger haben!`;
                }
                if (highAtkCount === 2 && highAtkSum === 3650) {
                    rule6Tip.textContent = 'Perfekt!';
                }
                rule6Result.innerHTML = '';
                rule6Result.appendChild(createIcon(highAtkCount <= 2 && highAtkSum <= 3650));

                // Check rule 7: 1500-1650 Monsters
                const rule7Value = document.getElementById('midAtkCount');
                const rule7Sum = document.getElementById('midAtkSum');
                const rule7Tip = document.getElementById('midAtkTip');
                const rule7Result = document.getElementById('midAtkResult');
                rule7Value.textContent = `${midAtkCount}`;
                rule7Sum.textContent = `${midAtkSum}`;
                if (midAtkCount < 3) {
                    rule7Tip.textContent = `Du dürftest noch ${3 - midAtkCount} mehr spielen!`;
                } else if (midAtkCount > 3) {
                    rule7Tip.textContent = `Du müsstest ${midAtkCount - 3} weniger spielen!`;
                } else {
                    rule7Tip.textContent = '';
                }
                if (midAtkSum < 4700) {
                    rule7Tip.textContent += ` Sie dürften noch ${4700 - midAtkSum} ATK mehr haben!`;
                } else if (midAtkSum > 4700) {
                    rule7Tip.textContent += ` Sie müssten ${midAtkSum - 4700} ATK weniger haben!`;
                }
                if (midAtkCount === 3 && midAtkSum === 4700) {
                    rule7Tip.textContent = 'Perfekt!';
                }
                rule7Result.innerHTML = '';
                rule7Result.appendChild(createIcon(midAtkCount <= 3 && midAtkSum <= 4700));

                // Make the tables visible
                document.getElementById('cardList').classList.remove('hidden');
                document.getElementById('ruleCheck').classList.remove('hidden');
            } catch (error) {
                console.error('Error parsing file:', error);
            }
        };
        reader.readAsText(file);
    } else {
        console.error('No file selected');
    }
}
