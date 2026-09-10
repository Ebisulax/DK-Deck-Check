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

                    mainCards = mainElement
                        ? Array.from(mainElement.getElementsByTagName('card')).map(card => card.textContent.trim())
                        : [];
                    sideCards = sideElement
                        ? Array.from(sideElement.getElementsByTagName('card')).map(card => card.textContent.trim())
                        : [];
                    extraCards = extraElement
                        ? Array.from(extraElement.getElementsByTagName('card')).map(card => card.textContent.trim())
                        : [];
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

                mainDeckTableBody.innerHTML = '';
                sideDeckTableBody.innerHTML = '';
                extraDeckTableBody.innerHTML = '';

                let totalAtk = 0;
                let count = 0;

                // Rule 6: 1700+ monsters (max 3)
                let highAtkCount = 0;

                // Rule 7: 1500+ monsters combined (max 5, max 8300 ATK total)
                let combinedAtkCount = 0;
                let combinedAtkSum = 0;

                let value5Count = 0;
                let totalValueSum = 0;
                let invalidCards = [];

                // Function to create a check or cross icon
                function createIcon(isCheck) {
                    const icon = document.createElement('img');
                    icon.src = isCheck
                        ? 'https://img.icons8.com/color/48/000000/checkmark.png'
                        : 'https://img.icons8.com/color/48/000000/cancel.png';
                    icon.alt = isCheck ? 'Check' : 'Cross';
                    icon.width = 24;
                    icon.height = 24;
                    return icon;
                }

                // Function to add cards to the table
                function addCardsToTable(cards, tableBody, isMainDeck = false) {
                    cards.forEach(cardIdOrName => {
                        const tableRow = document.createElement('tr');
                        const nameCell = document.createElement('td');
                        const atkCell = document.createElement('td');
                        const valueCell = document.createElement('td');
                        const allowedCell = document.createElement('td');

                        // Find match in card list
                        const cardData = fileExtension === 'xml'
                            ? cardList.find(card => card.name === cardIdOrName)
                            : cardList.find(card => card.id === parseInt(cardIdOrName));

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

                                    // Only Level 1-4 monsters count for these ATK rules
                                    if (level >= 1 && level <= 4) {
                                        // Rule 6: 1700+ monsters
                                        if (originalAtk >= 1700) {
                                            highAtkCount++;
                                        }

                                        // Rule 7: all 1500+ monsters combined
                                        if (originalAtk >= 1500) {
                                            combinedAtkCount++;
                                            combinedAtkSum += originalAtk;
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
                            nameCell.textContent = fileExtension === 'xml'
                                ? cardIdOrName
                                : `Unknown ID: ${cardIdOrName}`;
                            atkCell.textContent = '';
                            valueCell.textContent = '';
                            allowedCell.appendChild(createIcon(false));
                            invalidCards.push(
                                fileExtension === 'xml'
                                    ? cardIdOrName
                                    : `Unknown ID: ${cardIdOrName}`
                            );
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

                // Check rule 1: Allowed Cards
                const rule1Value = document.getElementById('allowedCardsValue');
                const rule1Tip = document.getElementById('allowedCardsTip');
                const rule1Result = document.getElementById('allowedCardsResult');

                rule1Value.textContent = invalidCards.length
                    ? invalidCards.join(', ')
                    : 'Alle Karten sind erlaubt';
                rule1Tip.textContent = invalidCards.length === 0
                    ? 'Perfekt!'
                    : 'Einige Karten sind nicht erlaubt';
                rule1Result.innerHTML = '';
                rule1Result.appendChild(createIcon(invalidCards.length === 0));

                // Check rule 2: Main Deck Card Count
                const mainDeckCount = mainCards.length;
                const rule2Value = document.getElementById('mainDeckCount');
                const rule2Tip = document.getElementById('mainDeckTip');
                const rule2Result = document.getElementById('mainDeckResult');

                rule2Value.textContent = `${mainDeckCount}`;
                if (mainDeckCount < 45) {
                    rule2Tip.textContent = `Dein Main Deck braucht noch ${45 - mainDeckCount} Karte${(45 - mainDeckCount) !== 1 ? 'n' : ''} mehr!`;
                } else if (mainDeckCount > 45) {
                    rule2Tip.textContent = `Dein Main Deck hat ${mainDeckCount - 45} Karte${(mainDeckCount - 45) !== 1 ? 'n' : ''} zu viel!`;
                } else {
                    rule2Tip.textContent = 'Perfekt!';
                }
                rule2Result.innerHTML = '';
                rule2Result.appendChild(createIcon(mainDeckCount === 45));

                // Check rule 3: Sum of Values
                const rule3Value = document.getElementById('totalValueSum');
                const rule3Tip = document.getElementById('totalValueTip');
                const rule3Result = document.getElementById('totalValueResult');
                const avgValue = mainDeckCount > 0 ? (totalValueSum / mainDeckCount).toFixed(2) : '0.00';

                rule3Value.textContent = `${totalValueSum} (Ø${avgValue})`;
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

                // Check rule 6: 1700+ Monsters (max 3)
                const rule6Value = document.getElementById('highAtkCount');
                const rule6Sum = document.getElementById('highAtkSum');
                const rule6Tip = document.getElementById('highAtkTip');
                const rule6Result = document.getElementById('highAtkResult');

                rule6Value.textContent = `${highAtkCount}`;
                if (rule6Sum) {
                    rule6Sum.textContent = '';
                }

                if (highAtkCount < 3) {
                    rule6Tip.textContent = `Du dürftest noch ${3 - highAtkCount} Monster mit 1700+ spielen!`;
                } else if (highAtkCount > 3) {
                    rule6Tip.textContent = `Du müsstest ${highAtkCount - 3} Monster mit 1700+ weniger spielen!`;
                } else {
                    rule6Tip.textContent = 'Perfekt!';
                }

                rule6Result.innerHTML = '';
                rule6Result.appendChild(createIcon(highAtkCount <= 3));

                // Check rule 7: 1500+ Monsters combined (max 5, max ATK sum 8300)
                const rule7Value = document.getElementById('midAtkCount');
                const rule7Sum = document.getElementById('midAtkSum');
                const rule7Tip = document.getElementById('midAtkTip');
                const rule7Result = document.getElementById('midAtkResult');

                rule7Value.textContent = `${combinedAtkCount}`;
                rule7Sum.textContent = `${combinedAtkSum}`;

                let rule7Messages = [];

                if (combinedAtkCount < 5) {
                    rule7Messages.push(`Du dürftest noch ${5 - combinedAtkCount} Monster mit 1500+ spielen!`);
                } else if (combinedAtkCount > 5) {
                    rule7Messages.push(`Du müsstest ${combinedAtkCount - 5} Monster mit 1500+ weniger spielen!`);
                }

                if (combinedAtkSum < 8300) {
                    rule7Messages.push(`Sie dürften zusammen noch ${8300 - combinedAtkSum} ATK mehr haben!`);
                } else if (combinedAtkSum > 8300) {
                    rule7Messages.push(`Sie müssten zusammen ${combinedAtkSum - 8300} ATK weniger haben!`);
                }

                if (combinedAtkCount === 5 && combinedAtkSum === 8300) {
                    rule7Tip.textContent = 'Perfekt!';
                } else if (rule7Messages.length > 0) {
                    rule7Tip.textContent = rule7Messages.join(' ');
                } else {
                    rule7Tip.textContent = 'Perfekt!';
                }

                rule7Result.innerHTML = '';
                rule7Result.appendChild(createIcon(combinedAtkCount <= 5 && combinedAtkSum <= 8300));

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

function searchCard() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    if (searchInput) {
        const filteredCards = cardList.filter(card =>
            card.name.toLowerCase().includes(searchInput)
        );

        if (filteredCards.length > 0) {
            const resultsTable = document.createElement('table');
            resultsTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>ATK</th>
                        <th>DEF</th>
                        <th>Level</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Effect</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const resultsBody = resultsTable.querySelector('tbody');

            filteredCards.forEach(card => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${card.name}</td>
                    <td>${card.atk !== undefined ? card.atk : ''}</td>
                    <td>${card.def !== undefined ? card.def : ''}</td>
                    <td>${card.level !== undefined ? card.level : ''}</td>
                    <td>${card.type}</td>
                    <td>${card.value !== undefined ? card.value : ''}</td>
                    <td>${card.desc !== undefined ? card.desc : ''}</td>
                `;
                resultsBody.appendChild(row);
            });

            searchResults.appendChild(resultsTable);
        } else {
            searchResults.textContent = 'Keine Karten gefunden.';
        }
    }
}

// Call loadCardList when the page loads to make the search function available immediately
window.onload = loadCardList;